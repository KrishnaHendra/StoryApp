import AppPresenter from '../../utils/presenter';
import * as StoryAPI from '../../data/api';

export default class HomePage {
  #presenter = null;
  #stories = [];

  async render() {
    return `
      <section class="hero-home">
        <div class="hero-overlay">
          <div class="hero-content">
          <h1>Welcome to Story App Krishna</h1>
          <p>Capture life’s moments. Share your stories. Inspire others with your journey.</p>
          <button id="scroll-button">Explore Stories</button>
          </div>
        </div>
      </section>

      <section id="story-list" class="story-list">
        <h2>Story List</h2>
        <div class="cards-container" id="reports-container">
          <div class="story-card">Story is empty</div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new AppPresenter({
      view: this,
      model: StoryAPI,
    });
    await this.#presenter.initialStory();

    const scrollButton = document.getElementById('scroll-button');
    if (scrollButton) {
      scrollButton.addEventListener('click', () => {
        document
          .getElementById('story-list')
          .scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  set stories(data) {
    this.#stories = data;
    this.populateReportsList('', data);
  }

  populateReportsList(message, stories) {
    console.log({ stories });
    const reportsContainer = document.getElementById('reports-container');

    if (!stories || stories.length <= 0) {
      console.log('No stories to display');
      this.populateReportsListEmpty();
      return;
    }

    const html = stories
      .map((story, index) => {
        const createdAtFormatted = new Date(story.createdAt).toLocaleDateString(
          'id-ID',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        );

        return `
      <div class="story-card">
        <img 
          src="${story.photoBase64 || story.photoUrl}" 
          alt="${story.name}" 
          class="story-photo" 
          onerror="this.onerror=null;this.src='images/placeholder.jpg';"
        >

        <div class="story-content">
          <h3 style="margin-bottom: 0;">${story.name}</h3>
          <p id="story-description">${story.description}</p>

          <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 10px;">
            <tr>
              <td style="border: 1px solid black; padding: 5px; background: #f5f5f5;">Date created</td>
              <td style="border: 1px solid black; padding: 5px; text-align: center;">${createdAtFormatted}</td>
            </tr>
          </table>

          <div 
            id="map-${index}" 
            style="height: 200px; width: 100%; margin-top: 10px;" 
            aria-label="Map showing the location of the story: ${story.name}"
          ></div>

          <div class="story-card__actions">
            <button 
              class="bookmark-button ${story.isBookmarked ? 'bookmarked' : ''}" 
              data-id="${story.id}" 
              aria-label="${
                story.isBookmarked
                  ? 'Remove from bookmarks'
                  : 'Add to bookmarks'
              }"
            >
              <i class="fas fa-bookmark"></i> 
              ${
                story.isBookmarked
                  ? 'Remove from Bookmarks'
                  : 'Add to Bookmarks'
              }
            </button>

            <a href="#/stories/${story.id}" class="detail-button">Read More</a>
          </div>
        </div>
      </div>
    `;
      })
      .join('');

    reportsContainer.innerHTML = html;

    const bookmarkButtons =
      reportsContainer.querySelectorAll('.bookmark-button');
    bookmarkButtons.forEach(button => {
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();

        const id = button.dataset.id;
        const isBookmarked = button.classList.contains('bookmarked');

        const story = stories.find(s => s.id === id);

        if (!story) {
          console.error('Story object not found for ID:', id);
          return;
        }

        try {
          const success = await this.#presenter.toggleBookmark(
            story,
            isBookmarked
          );

          if (success) {
            story.isBookmarked = !isBookmarked;

            button.classList.toggle('bookmarked');

            if (button.classList.contains('bookmarked')) {
              button.setAttribute('aria-label', 'Remove from bookmarks');
              button.innerHTML = `<i class="fas fa-bookmark"></i> Remove from Bookmarks`;
            } else {
              button.setAttribute('aria-label', 'Add to bookmarks');
              button.innerHTML = `<i class="fas fa-bookmark"></i> Add to Bookmarks`;
            }
          } else {
            console.error('Failed to update bookmark status in IndexedDB.');
          }
        } catch (error) {
          console.error(
            'An error occurred while toggling the bookmark:',
            error
          );
        }
      });
    });

    stories.forEach((story, index) => {
      if (story.lat && story.lon) {
        try {
          const map = L.map(`map-${index}`, {
            zoomControl: true,
            doubleClickZoom: false,
          }).setView([story.lat, story.lon], 13);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map);

          const marker = L.marker([story.lat, story.lon]).addTo(map);
          marker.bindPopup(`
            <div style="
              max-width: 180px;
              font-family: sans-serif;
              font-size: 12px;
              line-height: 1.3;
              color: #333;
              padding: 4px;
            ">
              <strong style="display: block; font-size: 13px; margin-bottom: 4px; color: #2c3e50;">
                ${story.name || 'Tanpa Nama'}
              </strong>
              <div style="margin-bottom: 4px;">
                <span style="font-weight: 600;">Deskripsi:</span><br>
                ${story.description || 'Tidak ada'}
              </div>
              <div>
                <span style="font-weight: 600;">Lat:</span> ${story.lat.toFixed(
                  4
                )}<br>
                <span style="font-weight: 600;">Lon:</span> ${story.lon.toFixed(
                  4
                )}
              </div>
            </div>
          `);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    });
  }

  populateReportsListEmpty() {
    const reportsContainer = document.getElementById('reports-container');
    reportsContainer.innerHTML = `
      <div class="story-card">Story is empty</div>
    `;
  }

  populateReportsListError(message) {
    const reportsContainer = document.getElementById('reports-container');
    reportsContainer.innerHTML = `
      <div class="story-card">An error occurred: ${message}</div>
    `;
  }

  showLoading() {
    const reportsContainer = document.getElementById('reports-container');
    reportsContainer.innerHTML = `<div class="loading-spinner">Loading...</div>`;
  }

  hideLoading() {
    const reportsContainer = document.getElementById('reports-container');
    reportsContainer.innerHTML = '';
  }
}
