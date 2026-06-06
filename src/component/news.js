import React, { useState, useEffect } from "react";
import Spinner from "./spinner";

const demoArticles = [
  {
    title: "Demo News (No API Key/Offline)",
    description:
      "Unable to fetch live news; showing demo content. Add REACT_APP_NEWS_API_KEY to .env for live data.",
    image: "https://via.placeholder.com/300x200?text=News",
    url: "#",
    publishedAt: new Date().toISOString(),
    source: { name: "Demo" },
  },
];

function News({ category = 'general' }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);

      const apiKey = process.env.REACT_APP_NEWS_API_KEY;
      const baseUrl =
        process.env.REACT_APP_NEWS_API_URL ||
        "https://newsapi.org/v2/top-headlines";

      // If no API key provided, attempt to fetch public RSS feeds (no key required)
      if (!apiKey) {
        try {
          const rssFeeds = [
            'http://feeds.bbci.co.uk/news/world/rss.xml',
            'https://feeds.reuters.com/Reuters/worldNews',
            'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
          ];

          // Try feeds in order until one returns items
          let rssArticles = [];
          for (const feed of rssFeeds) {
            try {
              // Use rss2json to fetch RSS as JSON (more reliable CORS proxy)
              const proxy = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed);
              const res = await fetch(proxy);
              if (!res.ok) continue;
              const json = await res.json().catch(() => null);
              if (!json || json.status !== 'ok' || !Array.isArray(json.items) || json.items.length === 0) continue;

              rssArticles = json.items.slice(0, 10).map((it) => {
                const title = it.title || 'No title';
                const description = it.description || it.content || '';
                const link = it.link || '#';
                const pubDate = it.pubDate || it.pubDate || new Date().toISOString();
                const image = it.thumbnail || (it.enclosure && it.enclosure.link) || null;

                return {
                  title,
                  description: description.replace(/<[^>]+>/g, '').slice(0, 300),
                  url: link,
                  image,
                  publishedAt: new Date(pubDate).toISOString(),
                  source: { name: json.feed && json.feed.title ? json.feed.title : feed },
                };
              });

              if (rssArticles.length > 0) break;
            } catch (e) {
              // try next feed
              continue;
            }
          }

          if (rssArticles && rssArticles.length > 0) {
            setArticles(rssArticles);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('RSS fallback failed:', e);
        }

        // If RSS fallback failed, show demo content with an explanatory error
        setError('Missing API key and RSS fallback failed. Showing demo data.');
        setArticles(demoArticles);
        setLoading(false);
        return;
      }

      try {
        // Support multiple provider formats (GNews, NewsAPI)
        // If the provided baseUrl already contains query params, preserve them.
        const separator = baseUrl.includes('?') ? '&' : '?';
        // Build request URL depending on configured provider to avoid calling the wrong API
        let apiUrl = '';
        let usedUrl = '';

        if (baseUrl.includes('gnews.io')) {
          apiUrl = `${baseUrl}${separator}token=${apiKey}&lang=en&country=in&max=10`;
          if (category && category !== 'general') {
            // gnews doesn't have same category param; add as topic when available
            apiUrl += `&topic=${encodeURIComponent(category)}`;
          }
        } else if (baseUrl.includes('newsapi.org')) {
          apiUrl = `${baseUrl}${separator}apiKey=${apiKey}&pageSize=10`;
          if (category && category !== 'general') {
            apiUrl += `&category=${encodeURIComponent(category)}`;
          } else {
            // default country if no category to give localized headlines
            apiUrl += `&country=in`;
          }
        } else {
          // default to NewsAPI-style query
          apiUrl = `${baseUrl}${separator}apiKey=${apiKey}&pageSize=10`;
          if (category && category !== 'general') apiUrl += `&category=${encodeURIComponent(category)}`;
          else apiUrl += `&country=in`;
        }

        usedUrl = apiUrl;
        const response = await fetch(apiUrl);

        // If response is not OK, attempt to read body for helpful error details
        if (!response.ok) {
          let bodyText = '';
          try {
            const clone = response.clone();
            // Try parse as json, fallback to text
            const json = await clone.json().catch(() => null);
            bodyText = json ? JSON.stringify(json) : await response.text().catch(() => '');
          } catch (e) {
            bodyText = 'Unable to read response body';
          }
          throw new Error(`API response error ${response.status} ${response.statusText} from ${usedUrl}: ${bodyText}`);
        }

        const data = await response.json();

        // If using NewsAPI and it returns zero articles, try alternative queries
        const isNewsAPI = usedUrl.includes('newsapi.org');
        if (isNewsAPI && Array.isArray(data.articles) && data.articles.length === 0) {
          try {
            // 1) Try top-headlines without country/category params
            const alt1 = `https://newsapi.org/v2/top-headlines?apiKey=${apiKey}&pageSize=10${category && category !== 'general' ? '&category=' + encodeURIComponent(category) : '&country=in'}`;
            const r1 = await fetch(alt1);
            if (r1.ok) {
              const d1 = await r1.json();
              if (Array.isArray(d1.articles) && d1.articles.length > 0) {
                // use these articles
                data.articles = d1.articles;
              }
            }
          } catch (e) {
            // ignore and try next fallback
          }

          if (Array.isArray(data.articles) && data.articles.length === 0) {
            try {
              // 2) Try the Everything endpoint searching for "world"
              const alt2 = `https://newsapi.org/v2/everything?apiKey=${apiKey}&q=${encodeURIComponent(category !== 'general' ? category : 'world')}&pageSize=10&sortBy=publishedAt`;
              const r2 = await fetch(alt2);
              if (r2.ok) {
                const d2 = await r2.json();
                if (Array.isArray(d2.articles) && d2.articles.length > 0) {
                  data.articles = d2.articles;
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }

        // Normalize response to an articles array with common fields
        let articlesList = [];

        if (Array.isArray(data.articles)) {
          articlesList = data.articles.map((a) => ({
            title: a.title,
            description: a.description || a.content,
            url: a.url || a.link,
            image: a.image || a.urlToImage || null,
            publishedAt: a.publishedAt || a.pubDate || new Date().toISOString(),
            source: a.source && a.source.name ? { name: a.source.name } : { name: a.source || 'Unknown' },
          }));
        } else if (Array.isArray(data.results)) {
          articlesList = data.results.map((a) => ({
            title: a.title,
            description: a.description || a.content,
            url: a.url || a.link,
            image: a.image || a.urlToImage || null,
            publishedAt: a.publishedAt || a.pubDate || new Date().toISOString(),
            source: a.source && a.source.name ? { name: a.source.name } : { name: a.source || 'Unknown' },
          }));
        }

        if (!articlesList || articlesList.length === 0) {
          // Try RSS fallback when API returns zero articles
          try {
            const rssFeeds = [
              'http://feeds.bbci.co.uk/news/world/rss.xml',
              'https://feeds.reuters.com/Reuters/worldNews',
              'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
            ];

            let rssArticles = [];
            for (const feed of rssFeeds) {
              try {
                const proxy = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed);
                const res = await fetch(proxy);
                if (!res.ok) continue;
                const json = await res.json().catch(() => null);
                if (!json || json.status !== 'ok' || !Array.isArray(json.items) || json.items.length === 0) continue;

                rssArticles = json.items.slice(0, 10).map((it) => {
                  const title = it.title || 'No title';
                  const description = it.description || it.content || '';
                  const link = it.link || '#';
                  const pubDate = it.pubDate || new Date().toISOString();
                  const image = it.thumbnail || (it.enclosure && it.enclosure.link) || null;

                  return {
                    title,
                    description: description.replace(/<[^>]+>/g, '').slice(0, 300),
                    url: link,
                    image,
                    publishedAt: new Date(pubDate).toISOString(),
                    source: { name: json.feed && json.feed.title ? json.feed.title : feed },
                  };
                });

                if (rssArticles.length > 0) break;
              } catch (e) {
                continue;
              }
            }

            if (rssArticles && rssArticles.length > 0) {
              setArticles(rssArticles);
              setError('API returned no articles — showing RSS feed fallback.');
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('RSS fallback error:', e);
          }

          // final fallback to demo content
          setError('No articles returned from API; showing demo content.');
          setArticles(demoArticles);
          setLoading(false);
          return;
        }

        setArticles(articlesList);
      } catch (err) {
        console.error("News fetch error:", err);
        setError(err.message);
        setArticles(demoArticles);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="news-container">
      <h1>Latest News</h1>

      {error && (
        <div className="error">
          <strong>⚠️ {error}</strong>
          <p>
            Verify your API key in <code>.env</code> and restart the app. Live news
            will show if API works.
          </p>
        </div>
      )}

      {articles.length > 0 && articles[0].source && articles[0].source.name === 'Demo' && (
        <div className="demo-notice">
          Showing demo content. To enable live news, add a valid NewsAPI key in <code>.env</code>.
        </div>
      )}

      <div className="news-grid">
        {articles.map((article, index) => (
          <div key={article.url || index} className="news-box">
            {article.image && (
              <img
                src={article.image}
                alt={article.title}
                className="news-image"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}

            <h3>{article.title || "No title"}</h3>

            <p>
              {article.description || article.content || "No description available"}
            </p>

            {article.source && (
              <small className="news-source">
                Source: {article.source.name || article.source}
              </small>
            )}

            <br />

            <small className="news-date">
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString()
                : "Date not available"}
            </small>

            <br />

            <a href={article.url || "#"} target="_blank" rel="noopener noreferrer">
              Read More →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default News;