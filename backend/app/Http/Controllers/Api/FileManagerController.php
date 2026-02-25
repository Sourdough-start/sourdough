<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FilePathRequest;
use App\Services\AuditService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileManagerController extends Controller
{
    public function __construct(
        private StorageService $storageService,
        private AuditService $auditService
    ) {}

    /**
     * List files and directories (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $path = $request->input('path', '');
        $path = trim(str_replace('\\', '/', $path), '/');
        if ($path !== '' && ! $this->validatePath($path)) {
            return response()->json(['message' => 'Invalid path.'], 422);
        }

        $page = max(1, (int) $request->input('page', 1));
        $perPage = min(100, max(1, (int) $request->input('per_page', config('app.pagination.default'))));

        try {
            $result = $this->storageService->listFiles($path, $page, $perPage);
            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('File listing failed', ['path' => $path, 'exception' => $e]);
            return response()->json(['message' => 'Failed to list files.'], 500);
        }
    }

    /**
     * Get file or directory details.
     */
    public function show(FilePathRequest $request): JsonResponse
    {
        $path = $request->getPath();
        $info = $this->storageService->getFileInfo($path);
        if ($info === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }
        $info['previewUrl'] = $this->storageService->getPreviewUrl($path);
        return response()->json($info);
    }

    /**
     * Upload file(s).
     */
    public function upload(Request $request): JsonResponse
    {
        $path = $request->input('path', '');
        $path = trim(str_replace('\\', '/', $path), '/');
        if ($path !== '' && ! $this->validatePath($path)) {
            return response()->json(['message' => 'Invalid path.'], 422);
        }

        $request->validate([
            'files' => ['required', 'array'],
            'files.*' => ['required', 'file'],
        ]);

        $files = $request->file('files');
        $files = is_array($files) ? $files : ($files ? [$files] : []);

        $settings = \App\Models\SystemSetting::getGroup('storage');
        // max_upload_size is stored in bytes (see storage settings page)
        $maxBytes = (int) ($settings['max_upload_size'] ?? 10485760);
        $allowedTypes = $settings['allowed_file_types'] ?? [];

        // Default whitelist when no file types are configured (security: block executable files)
        $defaultAllowedTypes = [
            // Documents
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
            // Images
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif',
            // Audio
            'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
            // Video
            'mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv',
            // Archives
            'zip', 'rar', '7z', 'tar', 'gz',
            // Other common safe types
            'json', 'xml', 'yaml', 'yml', 'md',
        ];

        // Use configured types if set, otherwise use default whitelist
        $effectiveAllowedTypes = !empty($allowedTypes) ? $allowedTypes : $defaultAllowedTypes;

        $uploaded = [];
        $errors = [];
        foreach ($files as $file) {
            if ($file->getSize() > $maxBytes) {
                $errors[] = $file->getClientOriginalName() . ': exceeds max size.';
                continue;
            }

            $ext = strtolower($file->getClientOriginalExtension());
            if (!in_array($ext, array_map('strtolower', $effectiveAllowedTypes), true)) {
                $errors[] = $file->getClientOriginalName() . ': file type not allowed.';
                continue;
            }

            // Validate MIME type matches extension (prevent extension spoofing)
            if (!$this->validateMimeType($file, $ext)) {
                $errors[] = $file->getClientOriginalName() . ': file type does not match content.';
                continue;
            }
            try {
                $result = $this->storageService->uploadFile($file, $path);
                $uploaded[] = $result;
                $this->auditService->log('file.uploaded', null, [], [
                    'path' => $result['path'],
                    'filename' => $result['name'],
                    'size' => $result['size'],
                ]);
            } catch (\Throwable $e) {
                Log::error('File upload failed', ['filename' => $file->getClientOriginalName(), 'exception' => $e]);
                $errors[] = $file->getClientOriginalName() . ': upload failed.';
            }
        }

        if (empty($uploaded)) {
            return response()->json([
                'message' => count($errors) > 0 ? 'Upload failed.' : 'No files to upload.',
                'errors' => $errors,
            ], 422);
        }

        return response()->json([
            'message' => 'Files uploaded.',
            'uploaded' => $uploaded,
            'errors' => $errors,
        ], 201);
    }

    /**
     * Download a file.
     */
    public function download(FilePathRequest $request): StreamedResponse|JsonResponse
    {
        $path = $request->getPath();
        try {
            $response = $this->storageService->downloadFile($path);
            $this->auditService->log('file.downloaded', null, [], ['path' => $path]);
            return $response;
        } catch (\Illuminate\Contracts\Filesystem\FileNotFoundException $e) {
            return response()->json(['message' => 'Not found.'], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            Log::error('File download failed', ['path' => $path, 'exception' => $e]);
            return response()->json(['message' => 'Download failed.'], 500);
        }
    }

    /**
     * Delete a file or directory.
     */
    public function destroy(FilePathRequest $request): JsonResponse
    {
        $path = $request->getPath();
        try {
            $this->storageService->deleteFile($path);
            $this->auditService->log('file.deleted', null, [], ['path' => $path]);
            return response()->json(['message' => 'Deleted.']);
        } catch (\Throwable $e) {
            Log::error('File deletion failed', ['path' => $path, 'exception' => $e]);
            return response()->json(['message' => 'Delete failed.'], 500);
        }
    }

    /**
     * Rename a file or directory.
     */
    public function rename(FilePathRequest $request): JsonResponse
    {
        $path = $request->getPath();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[^\/\\\\]+$/'],
        ]);
        $newName = $validated['name'];
        if (str_contains($newName, '..')) {
            return response()->json(['message' => 'Invalid name.'], 422);
        }
        try {
            $this->storageService->renameFile($path, $newName);
            $parent = dirname($path);
            $newPath = ($parent === '.' || $parent === '') ? $newName : $parent . '/' . $newName;
            $this->auditService->log('file.renamed', null, ['path' => $path], ['path' => $newPath]);
            return response()->json(['message' => 'Renamed.', 'path' => $newPath]);
        } catch (\Throwable $e) {
            Log::error('File rename failed', ['path' => $path, 'newName' => $newName, 'exception' => $e]);
            return response()->json(['message' => 'Rename failed.'], 500);
        }
    }

    /**
     * Move a file or directory.
     */
    public function move(FilePathRequest $request): JsonResponse
    {
        $path = $request->getPath();
        $validated = $request->validate([
            'destination' => ['required', 'string', 'max:2048'],
        ]);
        $destination = trim(str_replace('\\', '/', $validated['destination']), '/');
        if (! $this->validatePath($destination)) {
            return response()->json(['message' => 'Invalid destination path.'], 422);
        }
        try {
            $this->storageService->moveFile($path, $destination);
            $name = basename($path);
            $newPath = ($destination === '' || $destination === '.') ? $name : $destination . '/' . $name;
            $this->auditService->log('file.moved', null, ['path' => $path], ['path' => $newPath]);
            return response()->json(['message' => 'Moved.', 'path' => $newPath]);
        } catch (\Throwable $e) {
            Log::error('File move failed', ['path' => $path, 'destination' => $destination, 'exception' => $e]);
            return response()->json(['message' => 'Move failed.'], 500);
        }
    }

    private function validatePath(string $path): bool
    {
        if (str_contains($path, '..') || preg_match('#\0#', $path)) {
            return false;
        }
        $blocked = ['.env', 'config', '.git', 'bootstrap', 'vendor'];
        $segments = $path === '' ? [] : explode('/', trim($path, '/'));
        foreach ($segments as $segment) {
            if (in_array(strtolower($segment), $blocked, true)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Validate that file MIME type matches the claimed extension.
     * Prevents extension spoofing attacks.
     */
    private function validateMimeType(\Illuminate\Http\UploadedFile $file, string $extension): bool
    {
        $mimeType = $file->getMimeType();

        // Map of extensions to allowed MIME types
        $extensionMimeMap = [
            // Documents
            'pdf' => ['application/pdf'],
            'doc' => ['application/msword'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xls' => ['application/vnd.ms-excel'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'ppt' => ['application/vnd.ms-powerpoint'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'odt' => ['application/vnd.oasis.opendocument.text'],
            'ods' => ['application/vnd.oasis.opendocument.spreadsheet'],
            'odp' => ['application/vnd.oasis.opendocument.presentation'],
            'rtf' => ['application/rtf', 'text/rtf'],
            'txt' => ['text/plain'],
            'csv' => ['text/csv', 'text/plain', 'application/csv'],
            // Images
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'gif' => ['image/gif'],
            'bmp' => ['image/bmp', 'image/x-bmp'],
            'webp' => ['image/webp'],
            'svg' => ['image/svg+xml'],
            'ico' => ['image/x-icon', 'image/vnd.microsoft.icon'],
            'tiff' => ['image/tiff'],
            'tif' => ['image/tiff'],
            // Audio
            'mp3' => ['audio/mpeg', 'audio/mp3'],
            'wav' => ['audio/wav', 'audio/x-wav'],
            'ogg' => ['audio/ogg', 'application/ogg'],
            'flac' => ['audio/flac', 'audio/x-flac'],
            'aac' => ['audio/aac', 'audio/x-aac'],
            'm4a' => ['audio/mp4', 'audio/x-m4a'],
            // Video
            'mp4' => ['video/mp4'],
            'webm' => ['video/webm'],
            'avi' => ['video/x-msvideo', 'video/avi'],
            'mov' => ['video/quicktime'],
            'mkv' => ['video/x-matroska'],
            'wmv' => ['video/x-ms-wmv'],
            // Archives
            'zip' => ['application/zip', 'application/x-zip-compressed'],
            'rar' => ['application/x-rar-compressed', 'application/vnd.rar'],
            '7z' => ['application/x-7z-compressed'],
            'tar' => ['application/x-tar'],
            'gz' => ['application/gzip', 'application/x-gzip'],
            // Other
            'json' => ['application/json', 'text/json'],
            'xml' => ['application/xml', 'text/xml'],
            'yaml' => ['text/yaml', 'application/x-yaml', 'text/plain'],
            'yml' => ['text/yaml', 'application/x-yaml', 'text/plain'],
            'md' => ['text/markdown', 'text/plain'],
        ];

        // If extension is not in our map, reject it (unknown type)
        if (!isset($extensionMimeMap[$extension])) {
            return false;
        }

        // Check if the detected MIME type matches any allowed MIME for this extension
        return in_array($mimeType, $extensionMimeMap[$extension], true);
    }
}
