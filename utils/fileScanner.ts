
import { Book, Chapter } from '../types';

// 优化 9: 支持的音频格式白名单
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'm4b', 'flac', 'ogg', 'wav', 'aac']);

// 优化 10: 智能文件名解析 (去除 01. Track 等前缀)
const cleanTitle = (filename: string) => {
    return filename
        .replace(/\.[^/.]+$/, "") // 移除扩展名
        .replace(/^\d+[\s.-]+/, "") // 移除开头的数字序号 (e.g., "01 - ", "01.")
        .replace(/\[.*?\]/g, "") // 移除方括号内容
        .trim();
};

// 优化 11: 从 Blob 读取音频时长 (这就必须读取文件头，浏览器端较慢，这里用 Audio 元素临时解决)
const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(file);
        audio.src = url;
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(audio.duration);
        };
        audio.onerror = () => resolve(0);
    });
};

export interface ScannedFile {
    file: File;
    path: string;
}

// 优化 12: 递归扫描目录
export const scanDirectoryRecursively = async (dirHandle: FileSystemDirectoryHandle, path = ''): Promise<ScannedFile[]> => {
    const files: ScannedFile[] = [];
    
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const fileEntry = entry as FileSystemFileHandle;
            const name = fileEntry.name;
            const ext = name.split('.').pop()?.toLowerCase();
            
            if (ext && AUDIO_EXTENSIONS.has(ext)) {
                const file = await fileEntry.getFile();
                files.push({ file, path: path + '/' + name });
            }
        } else if (entry.kind === 'directory') {
            const subDir = entry as FileSystemDirectoryHandle;
            const subFiles = await scanDirectoryRecursively(subDir, path + '/' + subDir.name);
            files.push(...subFiles);
        }
    }
    return files;
};

// 优化 13: 将文件列表转换为书籍对象 (核心逻辑)
// 简单的文件夹分组策略：同一个文件夹下的音频视为一本书/系列的章节
export const organizeFilesToBooks = async (scannedFiles: ScannedFile[], onProgress?: (msg: string) => void): Promise<Book[]> => {
    const grouped: Record<string, ScannedFile[]> = {};

    // Group by directory
    scannedFiles.forEach(sf => {
        const dir = sf.path.substring(0, sf.path.lastIndexOf('/')) || '/Root';
        if (!grouped[dir]) grouped[dir] = [];
        grouped[dir].push(sf);
    });

    const books: Book[] = [];

    for (const [dir, files] of Object.entries(grouped)) {
        if (files.length === 0) continue;
        
        // Sort by filename for track order
        files.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true }));

        const firstFile = files[0];
        // 优化 14: 文件夹名作为书名
        const dirName = dir.split('/').pop() || cleanTitle(firstFile.file.name); 
        
        if (onProgress) onProgress(`Analyzing ${dirName}...`);

        // 优化 15: 尝试计算总时长 (并行处理)
        // 注意：大量文件会导致性能问题，实际生产应限制并发
        // 这里简化处理：只取前5个估算或异步加载，为了演示准确性，我们await全部
        let totalDuration = 0;
        const chapters: Chapter[] = [];
        
        for (const sf of files) {
            const dur = await getAudioDuration(sf.file);
            chapters.push({
                title: cleanTitle(sf.file.name),
                startTime: totalDuration,
                duration: dur
            });
            totalDuration += dur;
        }

        books.push({
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: dirName,
            author: 'Unknown Author', // 稍后通过 API 刮削修正
            coverUrl: 'https://placehold.co/400x400?text=No+Cover',
            duration: totalDuration,
            progress: 0,
            addedAt: Date.now(),
            audioUrl: URL.createObjectURL(firstFile.file), // 暂存第一个文件的URL，实际播放需动态切换
            description: `Imported from ${dir}. Contains ${files.length} tracks.`,
            chapters: chapters,
            fileType: firstFile.file.name.split('.').pop()?.toUpperCase()
        });
    }

    return books;
};
