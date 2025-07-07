import AppPresenter from '../../utils/presenter';
import { parseActivePathname } from '../../routes/urlParser';
import * as StoryAPI from '../../data/api';

export default class DetailPage {
  #presenter = null;
  #map;
  #story = null;

  async render() {
    return `<section style="display: flex; justify-content: center; padding: 20px;">
      <div class="story-detail__container" style="
        max-width: 800px;
        width: 100%;
        background-color: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        padding: 24px;
        font-family: Arial, sans-serif;
      ">
        <h1 id="story-name" style="
          font-size: 32px;
          color: #2c3e50;
          margin-bottom: 5px;
        "></h1>

        <p id="story-id" style="
          font-size: 13px;
          color: #999;
          margin-bottom: 16px;
          font-style: italic;
        "></p>

        <div id="story-description" style="
          font-size: 17px;
          line-height: 1.7;
          color: #444;
          margin-bottom: 10px;
          background-color: #f9f9f9;
          padding: 16px;
          border-left: 4px solid #3498db;
          border-radius: 6px;
          width: 100%;
        "></div>

        <img
          id="story-photo"
          src=""
          alt="Story Photo"
          style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin: 20px 0;"
        />

        <p id="story-created-at" style="color: #666; font-size: 16px;"></p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; border: 1px solid #ccc;">
          <tr>
            <td colspan="3" style="
              text-align: center;
              font-weight: bold;
              border: 1px solid #ccc;
              background-color: #f2f2f2;
              padding: 8px;
            ">Location</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">Latitude</td>
            <td id="story-lat" style="border: 1px solid #ccc; padding: 8px;"></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">Longitude</td>
            <td id="story-lon" style="border: 1px solid #ccc; padding: 8px;"></td>
          </tr>
        </table>

        <div id="map" style="height: 400px; width: 100%; margin-top: 20px; border-radius: 8px; overflow: hidden;"></div>

        <!-- Loading Container -->
        <div id="story-detail-loading-container" class="loading-container" style="
          display: none;
          margin-top: 20px;
          text-align: center;
        ">
          <div class="loader" style="
            border: 6px solid #f3f3f3;
            border-top: 6px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: auto;
          "></div>
        </div>
      </div>
    </section>

    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>`;
  }

  async afterRender() {
    const storyId = parseActivePathname().id;

    this.#presenter = new AppPresenter({
      view: this,
      model: StoryAPI,
    });

    await this.#presenter.getDetailStory(storyId);
  }

  StoryDetail(story) {
    if (!story) {
      console.error('StoryDetail: story is undefined');
      this.storeFailed('Story data is missing');
      return;
    }

    this.#story = story;

    document.getElementById('story-id').innerHTML = `ID: ${story.id || 'N/A'}`;
    document.getElementById('story-name').innerHTML = `Nama: ${
      story.name || 'N/A'
    }`;
    document.getElementById('story-description').innerHTML = `Deskripsi: ${
      story.description || 'N/A'
    }`;
    document.getElementById('story-photo').src = story.photoUrl || '';
    document.getElementById('story-created-at').innerHTML =
      `<b>Date created</b>: ${
        story.createdAt ? new Date(story.createdAt).toLocaleString() : 'N/A'
      }`;

    const hasLocation =
      story.lat != null &&
      story.lon != null &&
      story.lat !== '' &&
      story.lon !== '';

    if (hasLocation) {
      document.getElementById('story-lat').innerHTML = `Lat: ${story.lat}`;
      document.getElementById('story-lon').innerHTML = `Lon: ${story.lon}`;
    } else {
      document.querySelector('table').style.display = 'none';
      document.getElementById('map').style.display = 'none';
    }
  }

  async initialMap(lat, lon) {
    this.#map = L.map('map', {
      zoomControl: true,
      doubleClickZoom: false,
    });

    if (lat && lon) {
      this.#map.setView([lat, lon], 13);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.#map);

      const marker = L.marker([lat, lon]).addTo(this.#map);
      marker
        .bindPopup(
          `<b>${this.#story.name || 'Nama Tidak Tersedia'}</b><br>
        Deskripsi: ${this.#story.description || 'Tidak ada deskripsi'}<br>
        Latitude: ${lat.toFixed(6)}<br>
        Longitude: ${lon.toFixed(6)}`,
          { autoClose: false, closeOnClick: false }
        )
        .openPopup();
    } else {
      console.log('Unknown location.');
    }
  }

  hideDetailLoading() {
    const loadingContainer = document.getElementById(
      'story-detail-loading-container'
    );
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }
  }

  showDetailLoading() {
    const loadingContainer = document.getElementById(
      'story-detail-loading-container'
    );
    if (loadingContainer) {
      loadingContainer.style.display = 'block';
    }
  }

  storeFailed(message) {
    alert(`Error: ${message}`);
  }

  storeSuccessfully(message, data) {
    console.log(message, data);
  }
}
