
const axios = require('axios');

class HybridScraper {
  constructor() {
    this.sources = {
      itunes: 'https://itunes.apple.com/search',
      google: 'https://www.googleapis.com/books/v1/volumes',
      ximalaya: 'https://www.ximalaya.com/revision/search/main',
      openLibrary: 'https://openlibrary.org/search.json',
      douban: 'https://frodo.douban.com/api/v2/search'
    };

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
  }

  // Feature: Custom Source (User defined JSON API)
  async fetchCustomSource(query, url) {
    if (!url) return null;
    try {
        // Assume simple GET with q=param
        const target = url.includes('?') ? `${url}&q=${encodeURIComponent(query)}` : `${url}?q=${encodeURIComponent(query)}`;
        console.log(`[Scraper] Hitting custom source: ${target}`);
        const res = await axios.get(target, { timeout: 5000 });
        // Heuristic to find data in unknown JSON structure
        const data = res.data;
        if (!data) return null;

        // Try to map common fields
        return {
            source: 'Custom',
            title: data.title || data.name || data.results?.[0]?.title,
            author: data.author || data.artist || data.results?.[0]?.author,
            description: data.description || data.summary || data.results?.[0]?.description,
            coverUrl: data.cover || data.image || data.artwork || data.results?.[0]?.cover,
            tags: data.tags || data.genre
        };
    } catch (e) {
        console.error("Custom source failed:", e.message);
        return null;
    }
  }

  async fetchItunes(query) {
    try {
      const res = await axios.get(this.sources.itunes, {
        params: { term: query, country: 'cn', media: 'audiobook', entity: 'audiobook', limit: 1 },
        timeout: 3000
      });
      if (!res.data.results?.length) return null;
      const data = res.data.results[0];
      return {
        source: 'iTunes',
        title: data.collectionName,
        author: data.artistName,
        description: data.description,
        coverUrl: data.artworkUrl100?.replace('100x100bb', '600x600bb'), 
        publishYear: data.releaseDate ? data.releaseDate.substring(0, 4) : null,
        language: 'zh-cn'
      };
    } catch (e) { return null; }
  }

  async fetchItunesList(query, limit = 5) {
    try {
      const res = await axios.get(this.sources.itunes, {
        params: { term: query, country: 'cn', media: 'audiobook', entity: 'audiobook', limit },
        timeout: 4000
      });
      if (!res.data.results?.length) return [];
      return res.data.results.map((data) => ({
        source: 'iTunes',
        title: data.collectionName,
        author: data.artistName,
        description: data.description,
        coverUrl: data.artworkUrl100?.replace('100x100bb', '600x600bb'),
        publishYear: data.releaseDate ? data.releaseDate.substring(0, 4) : null,
        language: 'zh-cn'
      }));
    } catch (e) { return []; }
  }

  async fetchXimalaya(query) {
    try {
      const res = await axios.get(this.sources.ximalaya, {
        headers: this.headers,
        params: { core: 'album', kw: query, page: 1, rows: 1, spellchecker: true },
        timeout: 3000
      });
      const data = res.data?.data?.album?.docs?.[0];
      if (!data) return null;
      return {
        source: 'Ximalaya',
        title: data.title,
        author: data.nickname, 
        description: data.intro, 
        coverUrl: data.coverPath,
        rating: data.playCount,
        tags: data.categoryTitle
      };
    } catch (e) { return null; }
  }

  async fetchGoogleBooks(query) {
    try {
      const res = await axios.get(this.sources.google, {
        params: { q: query, maxResults: 1, printType: 'books', langRestrict: 'zh' },
        timeout: 3000
      });
      const info = res.data.items?.[0]?.volumeInfo;
      if (!info) return null;
      return {
        source: 'GoogleBooks',
        title: info.title,
        author: info.authors?.join(', '),
        description: info.description,
        coverUrl: info.imageLinks?.extraLarge || info.imageLinks?.thumbnail,
        publishYear: info.publishedDate?.substring(0, 4),
        publisher: info.publisher,
        tags: info.categories?.join(',')
      };
    } catch (e) { return null; }
  }

  async fetchGoogleBooksList(query, limit = 5) {
    try {
      const res = await axios.get(this.sources.google, {
        params: { q: query, maxResults: limit, printType: 'books', langRestrict: 'zh' },
        timeout: 4000
      });
      if (!res.data.items?.length) return [];
      return res.data.items.map((item) => {
        const info = item.volumeInfo;
        return {
          source: 'GoogleBooks',
          title: info.title,
          author: info.authors?.join(', '),
          description: info.description,
          coverUrl: info.imageLinks?.extraLarge || info.imageLinks?.thumbnail,
          publishYear: info.publishedDate?.substring(0, 4),
          publisher: info.publisher,
          tags: info.categories?.join(',')
        };
      });
    } catch (e) { return []; }
  }

  async fetchOpenLibrary(query) {
    try {
      const res = await axios.get(this.sources.openLibrary, {
        params: { q: query, limit: 1 },
        timeout: 5000
      });
      const doc = res.data.docs?.[0];
      if (!doc) return null;
      return {
        source: 'OpenLibrary',
        title: doc.title,
        author: doc.author_name?.[0],
        publishYear: doc.first_publish_year?.toString(),
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
        publisher: doc.publisher?.[0]
      };
    } catch (e) { return null; }
  }

  async fetchOpenLibraryList(query, limit = 5) {
    try {
      const res = await axios.get(this.sources.openLibrary, {
        params: { q: query, limit },
        timeout: 5000
      });
      const docs = res.data.docs || [];
      return docs.map((doc) => ({
        source: 'OpenLibrary',
        title: doc.title,
        author: doc.author_name?.[0],
        publishYear: doc.first_publish_year?.toString(),
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
        publisher: doc.publisher?.[0]
      }));
    } catch (e) { return []; }
  }

  async fetchDoubanList(query, limit = 5) {
    try {
      const res = await axios.get(this.sources.douban, {
        params: { q: query, count: limit },
        timeout: 5000
      });
      const items = res.data?.items || [];
      return items.map((item) => ({
        source: 'Douban',
        title: item.target?.title || item.title,
        author: item.target?.author || item.target?.card_subtitle || item.subtitle,
        description: item.target?.abstract || item.target?.intro,
        coverUrl: item.target?.cover_url || item.pic,
        tags: item.target?.tags?.map((t) => t.name).join(', ')
      }));
    } catch (e) { return []; }
  }

  scoreResult(result, query) {
    const normalizedQuery = query.toLowerCase();
    let score = 0.35;
    if (result.title?.toLowerCase().includes(normalizedQuery)) score += 0.25;
    if (result.author) score += 0.1;
    if (result.coverUrl) score += 0.1;
    if (result.description && result.description.length > 60) score += 0.1;
    if (result.tags) score += 0.05;
    return Math.min(1, score);
  }

  mergeMetadata(local, ...sources) {
    const final = { ...local };
    // Filter out nulls
    const validSources = sources.filter(s => s !== null);
    
    if (validSources.length === 0) return final;

    // Priority 1: Custom Source if available
    const custom = validSources.find(s => s.source === 'Custom');
    if (custom) {
        if(custom.title) final.title = custom.title;
        if(custom.author) final.author = custom.author;
        if(custom.description) final.description = custom.description;
        if(custom.coverUrl) final.coverUrl = custom.coverUrl;
    }

    // Priority 2: Cover Art
    if (!final.coverUrl || final.coverUrl.includes('placehold')) {
        const coverSource = validSources.find(s => s.source === 'iTunes') || 
                            validSources.find(s => s.source === 'Ximalaya') ||
                            validSources.find(s => s.source === 'GoogleBooks');
        if (coverSource?.coverUrl) final.coverUrl = coverSource.coverUrl;
    }

    // Priority 3: Description
    if (!final.description) {
        const descSource = validSources.find(s => s.source === 'Ximalaya') ||
                        validSources.find(s => s.source === 'iTunes') ||
                        validSources.find(s => s.source === 'GoogleBooks');
        if (descSource?.description) final.description = descSource.description;
    }

    // Priority 4: Author (if unknown)
    if (local.author === 'Unknown' || !local.author) {
        const authSource = validSources.find(s => s.author);
        if (authSource) final.author = authSource.author;
    }

    return final;
  }

  async scrape(query, localMetadata = {}, config = {}) {
    const enabledSources = [];
    if (config.useItunes !== false) enabledSources.push(this.fetchItunes(query));
    if (config.useXimalaya) enabledSources.push(this.fetchXimalaya(query));
    if (config.useGoogleBooks !== false) enabledSources.push(this.fetchGoogleBooks(query));
    if (config.useOpenLibrary) enabledSources.push(this.fetchOpenLibrary(query));
    if (config.customSourceUrl) enabledSources.push(this.fetchCustomSource(query, config.customSourceUrl));

    if (enabledSources.length === 0) {
        enabledSources.push(this.fetchItunes(query));
        enabledSources.push(this.fetchXimalaya(query));
    }

    console.log(`[Scraper] 🚀 Hybrid Scrape: "${query}" running ${enabledSources.length} sources...`);

    const results = await Promise.allSettled(enabledSources);
    const successResults = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

    const merged = this.mergeMetadata(localMetadata, ...successResults);
    const best = successResults[0];
    return {
      ...merged,
      metadataSource: best?.source || successResults[0]?.source,
      scrapeConfidence: this.scoreResult(best || merged, query)
    };
  }

  async searchAll(query, config = {}) {
    const tasks = [];
    if (config.useItunes !== false) tasks.push(this.fetchItunesList(query));
    if (config.useGoogleBooks !== false) tasks.push(this.fetchGoogleBooksList(query));
    if (config.useOpenLibrary) tasks.push(this.fetchOpenLibraryList(query));
    if (config.useXimalaya) tasks.push(this.fetchXimalaya(query).then(r => r ? [r] : []));
    if (config.useDouban) tasks.push(this.fetchDoubanList(query));
    if (config.customSourceUrl) tasks.push(this.fetchCustomSource(query, config.customSourceUrl).then(r => r ? [r] : []));

    if (tasks.length === 0) tasks.push(this.fetchItunesList(query));

    const settled = await Promise.allSettled(tasks);
    const flattened = settled
      .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
      .flatMap(r => r.value);

    const enriched = flattened.map(item => ({
      ...item,
      confidence: this.scoreResult(item, query)
    }));

    return enriched.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }
}

module.exports = new HybridScraper();
