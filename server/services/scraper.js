
const axios = require('axios');
const cheerio = require('cheerio');

class HybridScraper {
  constructor() {
    this.sources = {
      itunes: 'https://itunes.apple.com/search',
      google: 'https://www.googleapis.com/books/v1/volumes',
      ximalaya: 'https://www.ximalaya.com/revision/search',
      openLibrary: 'https://openlibrary.org/search.json',
      douban: 'https://frodo.douban.com/api/v2/search',
      // 外部 ABS Provider（可通过 docker 镜像 shanyanwcx/abs-ximalaya 与 zqing90/audiobookshelf-provider-douban 部署）
      absXimalaya: process.env.ABS_XIMALAYA_PROVIDER_URL || process.env.XIMALAYA_PROVIDER_URL || '',
      absDouban: process.env.ABS_DOUBAN_PROVIDER_URL || process.env.DOUBAN_PROVIDER_URL || ''
    };

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    this.fallbackCover = 'https://placehold.co/600x600?text=Cover';
  }

  normalizeCoverUrl(url) {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `https:${trimmed}`;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed.replace(/^:+/, '')}`;
    return trimmed.replace(/!op_type=[^&]+/i, '').replace(/\?.*$/, '');
  }

  safeCover(url) {
    return this.normalizeCoverUrl(url) || this.fallbackCover;
  }

  buildDoubanHeaders() {
    // Douban 会因无 cookie 拒绝请求，这里生成轻量级 bid 以提高成功率
    const bid = Math.random().toString(36).slice(2, 10);
    return {
      ...this.headers,
      Referer: 'https://www.douban.com/',
      Cookie: `bid=${bid};`
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
            coverUrl: this.safeCover(data.cover || data.image || data.artwork || data.results?.[0]?.cover),
            tags: data.tags || data.genre
        };
    } catch (e) {
        console.error("Custom source failed:", e.message);
        return null;
    }
  }

  normalizeProviderUrl(url) {
    if (!url) return '';
    return url.replace(/\/$/, '');
  }

  unwrapProviderItems(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.item) return [payload.item];
    return [];
  }

  mapProviderResult(item, source) {
    if (!item) return null;
    return {
      source,
      title: item.title || item.name || item.albumTitle || item.collectionName,
      author: item.author || item.artist || item.announcer || item.nickname,
      description: item.description || item.intro || item.summary || item.abstract,
      coverUrl: this.safeCover(item.cover || item.coverUrl || item.cover_path || item.pic || item.artwork),
      publishYear: item.year || item.publishYear || item.releaseDate,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || item.category || item.genre
    };
  }

  async fetchAbsProvider(baseUrl, query, source) {
    const root = this.normalizeProviderUrl(baseUrl);
    if (!root) return null;

    const attempts = [
      `${root}/search?query=${encodeURIComponent(query)}`,
      `${root}/search?term=${encodeURIComponent(query)}`,
      `${root}/?query=${encodeURIComponent(query)}`
    ];

    for (const url of attempts) {
      try {
        const res = await axios.get(url, { timeout: 5000 });
        const items = this.unwrapProviderItems(res.data);
        if (!items.length) continue;
        return this.mapProviderResult(items[0], source);
      } catch (e) {
        console.warn(`[Scraper] ${source} provider attempt failed at ${url}: ${e.message}`);
      }
    }
    return null;
  }

  async fetchAbsProviderList(baseUrl, query, source, limit = 5) {
    const root = this.normalizeProviderUrl(baseUrl);
    if (!root) return [];

    const attempts = [
      `${root}/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      `${root}/search?term=${encodeURIComponent(query)}&limit=${limit}`,
      `${root}/?query=${encodeURIComponent(query)}&limit=${limit}`
    ];

    for (const url of attempts) {
      try {
        const res = await axios.get(url, { timeout: 5000 });
        const items = this.unwrapProviderItems(res.data);
        if (!items.length) continue;
        return items
          .slice(0, limit)
          .map((item) => this.mapProviderResult(item, source))
          .filter(Boolean);
      } catch (e) {
        console.warn(`[Scraper] ${source} provider list attempt failed at ${url}: ${e.message}`);
      }
    }
    return [];
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
        coverUrl: this.safeCover(data.artworkUrl100?.replace('100x100bb', '600x600bb')),
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
        coverUrl: this.safeCover(data.artworkUrl100?.replace('100x100bb', '600x600bb')),
        publishYear: data.releaseDate ? data.releaseDate.substring(0, 4) : null,
        language: 'zh-cn'
      }));
    } catch (e) { return []; }
  }

  sanitizeXimalayaCover(path) {
    if (!path) return null;
    // API 返回常见的 //imagev2.xmcdn.com 或带 !op_type=3&columns=290&rows=290&magick=png 后缀
    const normalized = path.startsWith('http') ? path : `https:${path}`;
    return normalized.replace(/!op_type=.*$/, '');
  }

  async fetchXimalayaRichIntro(albumId) {
    if (!albumId) return null;
    try {
      const res = await axios.get('https://mobile.ximalaya.com/mobile-album/album/plant/detail', {
        headers: {
          ...this.headers,
          Referer: 'https://www.ximalaya.com/',
          'X-Requested-With': 'XMLHttpRequest'
        },
        params: { albumId, device: 'android', identity: 'podcast' },
        timeout: 5000
      });
      return res.data?.data?.richIntro || res.data?.richIntro || null;
    } catch (e) {
      return null;
    }
  }

  async fetchXimalayaSearch(query, limit = 5) {
    try {
      const res = await axios.get(this.sources.ximalaya, {
        headers: this.headers,
        params: { core: 'album', kw: query, page: 1, rows: limit, spellchecker: true },
        timeout: 4000
      });

      const docs = res.data?.data?.album?.docs || [];
      return docs.map((doc) => ({
        albumId: doc.albumId || doc.id,
        title: doc.title,
        author: doc.nickname,
        description: doc.intro,
        coverUrl: this.safeCover(this.sanitizeXimalayaCover(doc.coverPath || doc.cover_url)),
        tags: doc.categoryTitle,
        rating: doc.playCount
      }));
    } catch (e) {
      return [];
    }
  }

  async fetchXimalaya(query) {
    const list = await this.fetchXimalayaSearch(query, 1);
    if (!list.length) return null;
    const item = list[0];
    const intro = await this.fetchXimalayaRichIntro(item.albumId);
    return { ...item, source: 'Ximalaya', description: intro || item.description };
  }

  async fetchXimalayaList(query, limit = 5) {
    const list = await this.fetchXimalayaSearch(query, limit);
    if (!list.length) return [];

    const enriched = await Promise.all(
      list.map(async (item) => {
        const intro = await this.fetchXimalayaRichIntro(item.albumId);
        return { ...item, source: 'Ximalaya', description: intro || item.description };
      })
    );

    return enriched;
  }

  getInfoField($, label) {
    const span = $(`#info span.pl:contains("${label}")`).first();
    if (!span.length) return '';
    const texts = [];
    let node = span[0].nextSibling;
    while (node) {
      if (node.type === 'tag' && node.name === 'br') break;
      if (node.type === 'text') texts.push(node.data.trim());
      if (node.type === 'tag' && node.name === 'a') texts.push($(node).text().trim());
      node = node.nextSibling;
    }
    return texts.join('').replace(/\s+/g, ' ').trim();
  }

  async fetchDoubanSearch(query, limit = 5) {
    try {
      const res = await axios.get('https://www.douban.com/search', {
        headers: this.buildDoubanHeaders(),
        params: { cat: 1001, q: query },
        timeout: 6000
      });

      const $ = cheerio.load(res.data);
      const links = [];
      $('a.nbg').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const decoded = decodeURIComponent(href);
        const match = decoded.match(/https?:\/\/book\.douban\.com\/subject\/(\d+)/);
        if (match) links.push(`https://book.douban.com/subject/${match[1]}/`);
      });
      return Array.from(new Set(links)).slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  async fetchDoubanDetail(url) {
    try {
      const res = await axios.get(url, {
        headers: this.buildDoubanHeaders(),
        timeout: 6000
      });
      const $ = cheerio.load(res.data);

      const title = $('span[property="v:itemreviewed"]').text().trim();
      const author = this.getInfoField($, '作者');
      const publisher = this.getInfoField($, '出版社');
      const publishYear = this.getInfoField($, '出版年');
      const isbn = this.getInfoField($, 'ISBN');
      const description = $('#link-report .intro').first().text().trim() || $('meta[name="description"]').attr('content') || '';
      const coverUrl = this.safeCover($('#mainpic img').attr('src'));
      const tags = $('#db-tags-section a.tag').map((_, el) => $(el).text().trim()).get().join(', ');

      if (!title) return null;
      return {
        source: 'Douban',
        title,
        author,
        publisher,
        publishYear,
        isbn,
        description,
        coverUrl,
        tags
      };
    } catch (e) {
      return null;
    }
  }

  async fetchDoubanList(query, limit = 5) {
    const links = await this.fetchDoubanSearch(query, limit);
    const results = [];
    for (const link of links) {
      const detail = await this.fetchDoubanDetail(link);
      if (detail) results.push(detail);
    }
    return results;
  }

  async fetchDouban(query) {
    const list = await this.fetchDoubanList(query, 1);
    return list[0] || null;
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
        coverUrl: this.safeCover(info.imageLinks?.extraLarge || info.imageLinks?.thumbnail),
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
          coverUrl: this.safeCover(info.imageLinks?.extraLarge || info.imageLinks?.thumbnail),
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
        coverUrl: this.safeCover(doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null),
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
        coverUrl: this.safeCover(doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null),
        publisher: doc.publisher?.[0]
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

    final.coverUrl = this.safeCover(final.coverUrl);
    return final;
  }

  async scrape(query, localMetadata = {}, config = {}) {
    const enabledSources = [];
    const preferred = config.preferredSources || [];
    const pushSource = (name, fn) => {
        if (preferred.length === 0 || preferred.includes(name)) enabledSources.push(fn);
    };

    pushSource('iTunes', this.fetchItunes(query));
    pushSource('Ximalaya', config.useXimalaya ? this.fetchXimalaya(query) : null);
    pushSource('GoogleBooks', config.useGoogleBooks !== false ? this.fetchGoogleBooks(query) : null);
    pushSource('OpenLibrary', config.useOpenLibrary ? this.fetchOpenLibrary(query) : null);
    pushSource('Douban', config.useDouban !== false ? this.fetchDouban(query) : null);
    pushSource('AbsXimalayaProvider',
      config.useAbsXimalayaProvider === false
        ? null
        : this.fetchAbsProvider(config.absXimalayaProviderUrl || this.sources.absXimalaya, query, 'AbsXimalayaProvider')
    );
    pushSource('AbsDoubanProvider',
      config.useDoubanProvider === false
        ? null
        : this.fetchAbsProvider(config.doubanProviderUrl || this.sources.absDouban, query, 'AbsDoubanProvider')
    );
    pushSource('Custom', config.customSourceUrl ? this.fetchCustomSource(query, config.customSourceUrl) : null);

    const filteredSources = enabledSources.filter(Boolean);
    if (filteredSources.length === 0) {
        filteredSources.push(this.fetchItunes(query));
        filteredSources.push(this.fetchXimalaya(query));
    }

    console.log(`[Scraper] 🚀 Hybrid Scrape: "${query}" running ${enabledSources.length} sources...`);

    const results = await Promise.allSettled(filteredSources);
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
    const preferred = config.preferredSources || [];
    const pushTask = (name, promiseFactory) => {
        if (preferred.length === 0 || preferred.includes(name)) tasks.push(promiseFactory);
    };

    pushTask('iTunes', this.fetchItunesList(query));
    pushTask('GoogleBooks', config.useGoogleBooks !== false ? this.fetchGoogleBooksList(query) : null);
    pushTask('OpenLibrary', config.useOpenLibrary ? this.fetchOpenLibraryList(query) : null);
    pushTask('Ximalaya', config.useXimalaya ? this.fetchXimalayaList(query) : null);
    pushTask('Douban', config.useDouban !== false ? this.fetchDoubanList(query) : null);
    pushTask(
      'AbsXimalayaProvider',
      config.useAbsXimalayaProvider === false
        ? null
        : this.fetchAbsProviderList(
            config.absXimalayaProviderUrl || this.sources.absXimalaya,
            query,
            'AbsXimalayaProvider'
          )
    );
    pushTask(
      'AbsDoubanProvider',
      config.useDoubanProvider === false
        ? null
        : this.fetchAbsProviderList(config.doubanProviderUrl || this.sources.absDouban, query, 'AbsDoubanProvider')
    );
    pushTask('Custom', config.customSourceUrl ? this.fetchCustomSource(query, config.customSourceUrl).then(r => r ? [r] : []) : null);

    const filtered = tasks.filter(Boolean);

    if (filtered.length === 0) filtered.push(this.fetchItunesList(query));

    const settled = await Promise.allSettled(filtered);
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
