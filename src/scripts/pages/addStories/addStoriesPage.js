import AppPresenter from '../../utils/presenter';
import { convertBase64ToBlob } from '../../utils/index';
import * as StoryAPI from '../../data/api';
import Camera from '../../utils/camera';

export default class NewPage {
  #presenter;
  #form;
  #camera;
  #isCameraOpen = false;
  #takenDocumentations = [];
  #map = null;
  #marker = null;
  #cleanupFunctions = [];

  async render() {
    return `
    <section>
      <div class="new-story__header">
        <div class="container">
          <h1 class="new-story__header__title">Create a New Story</h1>
          <p class="new-story__header__description">
            Fill out the form below to share your story with others.
          </p>
        </div>
      </div>
    </section>

    <section class="container">
      <div class="new-form__container">
        <form id="new-form" class="new-form">
          <div class="form-control">
            <label for="description-input" class="new-form__description__title">Story Description</label>

            <div class="new-form__description__container">
              <textarea
                id="description-input"
                name="description"
                placeholder="Write something meaningful here..."
              ></textarea>
            </div>
          </div>

          <div class="form-control">
            <label for="documentations-input" class="new-form__documentations__title">Photo Documentation</label>
            <div id="documentations-more-info">You can include one or more photos as part of your story.</div>

            <div class="new-form__documentations__container">
              <div class="new-form__documentations__buttons">
                <button id="documentations-input-button" class="btn btn-outline" type="button">
                  Upload Photo
                </button>
                <input
                  id="documentations-input"
                  name="documentations"
                  type="file"
                  accept="image/*"
                  hidden="hidden"
                  aria-describedby="documentations-more-info"
                />

                <button id="open-documentations-camera-button" class="btn btn-outline" type="button">
                  Use Camera
                </button>
              </div>

              <div id="camera-container" class="new-form__camera__container">
                <video id="camera-video" class="new-form__camera__video">
                  Video stream not available.
                </video>
                <canvas style="display: none;" id="camera-canvas" class="new-form__camera__canvas"></canvas>

                <div class="new-form__camera__tools">
                  <select id="camera-select"></select>
                  <div class="new-form__camera__tools_buttons">
                    <button id="camera-take-button" class="btn" type="button">
                      Capture Photo
                    </button>
                  </div>
                </div>
              </div>

              <ul id="documentations-taken-list" class="new-form__documentations__outputs"></ul>
            </div>
          </div>

          <div class="form-control">
            <div class="new-form__location__title">Story Location</div>

            <div class="new-form__location__container">
              <div class="new-form__location__map__container">
                <div id="map"></div>
                <div id="map-loading-container"></div>
              </div>
              <div class="new-form__location__lat-lng">
                <input type="text" name="latitude" value="-6.175389">
                <input type="text" name="longitude" value="106.827139">
              </div>
            </div>
          </div>

          <div class="form-buttons">
            <span id="submit-button-container">
              <a class="btn" href="#/">Cancel</a>
            </span>
            <button class="btn" type="submit">Submit Story</button>
          </div>
        </form>
      </div>
    </section>
  `;
  }

  async afterRender() {
    this.#presenter = new AppPresenter({
      view: this,
      model: StoryAPI,
    });
    this.#takenDocumentations = [];

    await this.initialMap();
    this.#setupForm();

    window.addEventListener(
      'hashchange',
      this.#handlePageTransition.bind(this)
    );
    this.#cleanupFunctions.push(() => {
      window.removeEventListener(
        'hashchange',
        this.#handlePageTransition.bind(this)
      );
    });
  }

  #handlePageTransition = () => {
    if (this.#isCameraOpen && this.#camera) {
      this.#camera.stop();
      this.#isCameraOpen = false;
      const cameraContainer = document.getElementById('camera-container');
      if (cameraContainer) {
        cameraContainer.classList.remove('open');
      }
      const cameraButton = document.getElementById(
        'open-documentations-camera-button'
      );
      if (cameraButton) {
        cameraButton.textContent = 'Open Camera';
      }
    }
  };

  #setupForm() {
    this.#form = document.getElementById('new-form');
    this.#form.addEventListener('submit', async event => {
      event.preventDefault();

      const description = this.#form.elements.namedItem('description').value;
      const photo = this.#takenDocumentations[0]?.blob;
      const lat = parseFloat(this.#form.elements.namedItem('latitude').value);
      const lon = parseFloat(this.#form.elements.namedItem('longitude').value);

      if (!description || !photo) {
        alert('Description and photo are required.');
        return;
      }

      try {
        await this.#presenter.postNewStory({
          description,
          photo,
          lat,
          lon,
        });
      } catch (error) {
        console.error('Error posting story:', error);
        this.storeFailed('Failed to post story. Please try again.');
      }
    });

    document
      .getElementById('documentations-input')
      .addEventListener('change', async event => {
        this.#takenDocumentations = [];
        await this.#addTakenPicture(event.target.files[0]);
        await this.#populateTakenPictures();
      });

    document
      .getElementById('documentations-input-button')
      .addEventListener('click', () => {
        this.#form.elements.namedItem('documentations-input').click();
      });

    const cameraContainer = document.getElementById('camera-container');
    document
      .getElementById('open-documentations-camera-button')
      .addEventListener('click', async event => {
        try {
          cameraContainer.classList.toggle('open');
          this.#isCameraOpen = cameraContainer.classList.contains('open');

          if (this.#isCameraOpen) {
            event.currentTarget.textContent = 'Close Camera';
            this.#setupCamera();
            await this.#camera.launch();
            return;
          }

          event.currentTarget.textContent = 'Open Camera';
          if (this.#camera) {
            this.#camera.stop();
          }
        } catch (error) {
          console.error('Error handling camera:', error);
          cameraContainer.classList.remove('open');
          this.#isCameraOpen = false;
          event.currentTarget.textContent = 'Open Camera';
          if (this.#camera) {
            this.#camera.stop();
          }
        }
      });
  }

  async initialMap() {
    this.#map = L.map('map', {
      zoomControl: true,
      doubleClickZoom: false,
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;

          this.#map.setView([latitude, longitude], 13);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(this.#map);

          this.#marker = L.marker([latitude, longitude]).addTo(this.#map);

          this.#marker
            .bindPopup(
              `<b>Initial Location</b><br>Latitude: ${latitude.toFixed(
                6
              )}<br>Longitude: ${longitude.toFixed(6)}`,
              { autoClose: false, closeOnClick: false }
            )
            .openPopup();

          this.#map.on('click', event => {
            const { lat, lng } = event.latlng;

            if (this.#marker) {
              this.#marker.setLatLng([lat, lng]);
            } else {
              this.#marker = L.marker([lat, lng]).addTo(this.#map);
            }

            this.#marker
              .bindPopup(
                `<b>Selected Location</b><br>Latitude: ${lat.toFixed(
                  6
                )}<br>Longitude: ${lng.toFixed(6)}`,
                { autoClose: false, closeOnClick: false }
              )
              .openPopup();

            this.#form.elements.namedItem('latitude').value = lat.toFixed(6);
            this.#form.elements.namedItem('longitude').value = lng.toFixed(6);
          });
        },
        error => {
          console.error('Geolocation error: ', error);
        }
      );
    } else {
      console.log('Geolocation is not supported by this browser.');
    }
  }

  #setupCamera() {
    if (!this.#camera) {
      this.#camera = new Camera({
        video: document.getElementById('camera-video'),
        cameraSelect: document.getElementById('camera-select'),
        canvas: document.getElementById('camera-canvas'),
      });
    }

    this.#camera.addCheeseButtonListener('#camera-take-button', async () => {
      const image = await this.#camera.takePicture();
      this.#takenDocumentations = [];
      await this.#addTakenPicture(image);
      await this.#populateTakenPictures();
    });
  }

  async #addTakenPicture(image) {
    let blob = image;

    if (image instanceof String) {
      blob = await convertBase64ToBlob(image, 'image/png');
    }

    const newDocumentation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      blob: blob,
    };
    this.#takenDocumentations = [
      ...this.#takenDocumentations,
      newDocumentation,
    ];
  }

  async #populateTakenPictures() {
    const html = this.#takenDocumentations.reduce(
      (accumulator, picture, currentIndex) => {
        const imageUrl = URL.createObjectURL(picture.blob);
        return accumulator.concat(`
            <li class="new-form__documentations__outputs-item">
              <button type="button" data-deletepictureid="${
                picture.id
              }" class="new-form__documentations__outputs-item__delete-btn">
                <img src="${imageUrl}" alt="Photo ${currentIndex + 1}" width="100%">
              </button>
            </li>
          `);
      },
      ''
    );

    document.getElementById('documentations-taken-list').innerHTML = html;

    document.querySelectorAll('button[data-deletepictureid]').forEach(button =>
      button.addEventListener('click', event => {
        const pictureId = event.currentTarget.dataset.deletepictureid;

        const deleted = this.#removePicture(pictureId);
        if (!deleted) {
          console.log(`Picture with id ${pictureId} was not found`);
        }

        this.#populateTakenPictures();
      })
    );
  }

  #removePicture(id) {
    const selectedPicture = this.#takenDocumentations.find(picture => {
      return picture.id == id;
    });

    if (!selectedPicture) {
      return null;
    }

    this.#takenDocumentations = this.#takenDocumentations.filter(picture => {
      return picture.id != selectedPicture.id;
    });

    return selectedPicture;
  }

  storeSuccessfully(message) {
    this.clearForm();
    window.history.replaceState(null, '', '#/');
    window.dispatchEvent(
      new CustomEvent('navigate', { detail: { path: '/' } })
    );
  }

  storeFailed(message) {
    alert(message);
  }

  clearForm() {
    this.#form.reset();
  }

  showMapLoading() {
    document.getElementById('map-loading-container').innerHTML =
      generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    document.getElementById('map-loading-container').innerHTML = '';
  }

  showSubmitLoadingButton() {
    document.getElementById('submit-button-container').innerHTML = `
      <button class="btn" type="submit" disabled>
        <i class="fas fa-spinner loader-button"></i> Add Story
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    document.getElementById('submit-button-container').innerHTML = `
      <a class="btn" href="#/">Batal</a>
    `;
  }
}
