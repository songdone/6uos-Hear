
import { Book } from '../types';

interface ScraperResult {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  publisher?: string;
  publishedDate?: string;
  narrator?: string;
  language?: string;
  tags?: string;
  confidence?: number;
  source: 'iTunes' | 'GoogleBooks' | 'Ximalaya' | 'OpenLibrary' | 'Douban' | 'Custom';
}

const API_BASE = '/api/metadata/search';

export interface ScrapeConfig {
  useItunes?: boolean;
  useGoogleBooks?: boolean;
  useOpenLibrary?: boolean;
  useXimalaya?: boolean;
  useDouban?: boolean;
  customSourceUrl?: string;
  preferredSources?: string[];
}

const API_BASE = '/api/metadata/search';

export interface ScrapeConfig {
  useItunes?: boolean;
  useGoogleBooks?: boolean;
  useOpenLibrary?: boolean;
  useXimalaya?: boolean;
  useDouban?: boolean;
  customSourceUrl?: string;
  preferredSources?: string[];
}

const API_BASE = '/api/metadata/search';

// 优化 1: 高清封面替换逻辑 (iTunes 返回的通常是 100x100)
const getHighResItunesCover = (url: string) => {
  return url.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
};

// 优化 2: 描述文本清洗 (去除 HTML 标签)
const stripHtml = (html: string) => {
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

// 优化 3: iTunes Search API 对接
export const searchItunes = async (query: string): Promise<ScraperResult[]> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    // 优化 4: 限制媒体类型为 audiobook 和 podcast
    const response = await fetch(`https://itunes.apple.com/search?term=${encodedQuery}&media=audiobook&entity=audiobook&limit=5`);
    
    if (!response.ok) throw new Error('iTunes API failed');
    
    const data = await response.json();
    
    return data.results.map((item: any) => ({
      title: item.collectionName || item.trackName,
      author: item.artistName,
      description: stripHtml(item.description || item.longDescription || ''),
      coverUrl: getHighResItunesCover(item.artworkUrl100),
      publisher: item.copyright,
      publishedDate: item.releaseDate,
      source: 'iTunes'
    }));
  } catch (error) {
    console.error("iTunes Scrape Error:", error);
    return [];
  }
};

// 优化 5: Google Books API 对接
export const searchGoogleBooks = async (query: string): Promise<ScraperResult[]> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=5&printType=books`);
    
    if (!response.ok) throw new Error('Google Books API failed');
    
    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((item: any) => {
        const info = item.volumeInfo;
        return {
            title: info.title,
            author: info.authors ? info.authors.join(', ') : 'Unknown',
            description: info.description || '',
            // 优化 6: 尝试获取最大尺寸图片
            coverUrl: info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.thumbnail || '',
            publisher: info.publisher,
            publishedDate: info.publishedDate,
            source: 'GoogleBooks'
        };
    });
  } catch (error) {
    console.error("Google Books Scrape Error:", error);
    return [];
  }
};

// 优化 7: 聚合搜索逻辑
export const scrapeMetadata = async (query: string, config?: ScrapeConfig): Promise<ScraperResult[]> => {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, config })
      });
      if (res.ok) {
        const data = await res.json();
        return data as ScraperResult[];
      }
    } catch (error) {
      console.error('Backend scraper unavailable, falling back to client sources.', error);
    }

    const [itunes, google] = await Promise.all([
        searchItunes(query),
        searchGoogleBooks(query)
    ]);
    return [...itunes, ...google];
};
