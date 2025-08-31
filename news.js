document.addEventListener('DOMContentLoaded', () => {
    if (typeof newsData === 'undefined') {
        console.error("News database (news_database.js) not found!");
        return;
    }

    const articles = newsData;
    const featuredContainer = document.getElementById('featured-article-container');
    const gridContainer = document.getElementById('news-grid-container');
    const searchInput = document.getElementById('news-search-input');
    const moreNewsHeader = document.querySelector('.news-section-header');

    const featuredTemplate = document.getElementById('featured-article-template');
    const articleTemplate = document.getElementById('article-card-template');

    // Function to render the main featured article
    function renderFeaturedArticle(article) {
        featuredContainer.innerHTML = '';
        const clone = featuredTemplate.content.cloneNode(true);
        const articleElement = clone.querySelector('.featured-article');
        
        // Set background image for the hero
        articleElement.style.backgroundImage = `url(${article.imageUrl})`;

        clone.querySelector('a').href = article.url;
        clone.querySelector('[data-category]').textContent = article.category;
        clone.querySelector('[data-title]').textContent = article.title;
        clone.querySelector('[data-snippet]').textContent = article.snippet;
        
        featuredContainer.appendChild(clone);
        featuredContainer.style.display = 'block';
    }

    // Function to render the grid of other articles
    function renderArticleGrid(articles) {
        gridContainer.innerHTML = '';
        if (articles.length === 0) {
            gridContainer.innerHTML = `<p class="no-data">No articles found.</p>`;
            return;
        }

        articles.forEach(article => {
            const clone = articleTemplate.content.cloneNode(true);
            clone.querySelector('a').href = article.url;
            clone.querySelector('[data-img]').src = article.imageUrl;
            clone.querySelector('[data-category]').textContent = article.category;
            clone.querySelector('[data-title]').textContent = article.title;
            clone.querySelector('[data-snippet]').textContent = article.snippet;
            gridContainer.appendChild(clone);
        });
    }

    function renderPage(filter = '') {
        const lowerCaseFilter = filter.toLowerCase().trim();

        const filteredArticles = articles.filter(article => 
            article.title.toLowerCase().includes(lowerCaseFilter) ||
            article.category.toLowerCase().includes(lowerCaseFilter) ||
            article.snippet.toLowerCase().includes(lowerCaseFilter)
        );

        // Sort all filtered articles by date, newest first
        filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (lowerCaseFilter) {
            // If searching, hide featured article and show all results in grid
            featuredContainer.style.display = 'none';
            moreNewsHeader.style.display = 'none';
            renderArticleGrid(filteredArticles);
        } else {
            // If not searching, show the featured article and the rest in the grid
            if (filteredArticles.length > 0) {
                const [latestArticle, ...otherArticles] = filteredArticles;
                renderFeaturedArticle(latestArticle);
                renderArticleGrid(otherArticles);
                moreNewsHeader.style.display = 'block';
            } else {
                featuredContainer.style.display = 'none';
                moreNewsHeader.style.display = 'none';
                gridContainer.innerHTML = `<p class="no-data">No articles available.</p>`;
            }
        }
    }

    searchInput.addEventListener('input', () => renderPage(searchInput.value));

    // Initial render of the full page
    renderPage();
});