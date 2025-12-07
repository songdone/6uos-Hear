
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
  source: 'iTunes' | 'GoogleBooks' | 'Ximalaya' | 'OpenLibrary' | 'Douban' | 'AbsXimalayaProvider' | 'AbsDoubanProvider' | 'Custom';
}

export interface ScrapeConfig {
  useItunes?: boolean;
  useGoogleBooks?: boolean;
  useOpenLibrary?: boolean;
  useXimalaya?: boolean;
  useDouban?: boolean;
  useAbsXimalayaProvider?: boolean;
  useDoubanProvider?: boolean;
  absXimalayaProviderUrl?: string;
  doubanProviderUrl?: string;
  customSourceUrl?: string;
  preferredSources?: string[];
}

export const DEFAULT_SCRAPE_CONFIG: ScrapeConfig = {
  useItunes: true,
  useGoogleBooks: true,
  useOpenLibrary: true,
  useXimalaya: true,
  useDouban: true,
  useAbsXimalayaProvider: true,
  useDoubanProvider: true,
  preferredSources: ['Douban', 'AbsDoubanProvider', 'Ximalaya', 'AbsXimalayaProvider', 'iTunes', 'GoogleBooks', 'OpenLibrary'],
  absXimalayaProviderUrl: '',
  doubanProviderUrl: '',
  customSourceUrl: ''
};

const API_BASE = '/api/metadata/search';

/* -------------------------------------------------------
 * Helper: 高清封面替换（iTunes）
 * -----------------------------------------------------*/
const getHighResItunesCover = (url: string) => {
  return url
    ?.replace('100x100bb', '600x600bb')
    ?.replace('60x60bb', '600x600bb');
};

/* -------------------------------------------------------
 * Helper: 清洗 HTML 描述
 * -----------------------------------------------------*/
const stripHtml = (html: string) => {
  if (!html) return '';
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

/* -------------------------------------------------------
 * Search: iTunes Audiobooks
 * -----------------------------------------------------*/
export const searchItunes = async (query: string): Promise<ScraperResult[]> => {
  try {
    const encodedQuery = encodeURIComponent(query);

    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodedQuery}&media=audiobook&entity=audiobook&limit=5`
    );

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
  } catch (err) {
    console.error("iTunes Scrape Error:", err);
    return [];
  }
};

/* -------------------------------------------------------
 * Search: Google Books
 * -----------------------------------------------------*/
export const searchGoogleBooks = async (query: string): Promise<ScraperResult[]> => {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=5&printType=books`
    );

    if (!res.ok) throw new Error('Google Books API failed');

    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((item: any) => {
      const info = item.volumeInfo;
      return {
        title: info.title,
        author: info.authors?.join(', ') || 'Unknown',
        description: info.description || '',
        coverUrl:
          info.imageLinks?.extraLarge ||
          info.imageLinks?.large ||
          info.imageLinks?.thumbnail ||
          '',
        publisher: info.publisher,
        publishedDate: info.publishedDate,
        source: 'GoogleBooks',
      };
    });
  } catch (err) {
    console.error("Google Books Scrape Error:", err);
    return [];
  }
};

/* -------------------------------------------------------
 * Aggregated Metadata Scraping
 * -----------------------------------------------------*/
export const scrapeMetadata = async (
  query: string,
  config?: ScrapeConfig
): Promise<ScraperResult[]> => {
  try {
    // Try backend first
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, config }),
    });

    if (res.ok) {
      const data = await res.json();
      return data as ScraperResult[];
    }
  } catch (err) {
    console.error(
      'Backend metadata scraper unavailable — using client fallbacks.',
      err
    );
  }

  // Fallback to front-end scrapers
  const [itunes, google] = await Promise.all([
    searchItunes(query),
    searchGoogleBooks(query),
  ]);

  return [...itunes, ...google];
};
