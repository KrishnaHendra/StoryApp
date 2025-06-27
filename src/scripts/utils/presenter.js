import * as StoryAPI from '../data/api';
import {
  addBookmark,
  getBookmark,
  getAllBookmarks,
  deleteBookmark,
} from '../data/idbHelper';

export default class AppPresenter {
  #view;
  #model;
  #authModel;

  constructor({ view, model, authModel = null }) {
    this.#view = view;
    this.#model = model;
    this.#authModel = authModel;
  }

  async getLogin({ email, password }) {
    this.#view.showSubmitLoadingButton();
    try {
      const response = await this.#model.getLogin({ email, password });
      console.log(response);
      if (!response.ok) {
        console.error('getLogin: response:', response);
        this.#view.loginFailed(response.message);
        return;
      }

      if (this.#authModel) {
        this.#authModel.putAccessToken(response.loginResult.token);
      }

      this.#view.loginSuccessfully(response.message, response.loginResult);
    } catch (error) {
      console.error('getLogin: error:', error);
      this.#view.loginFailed(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }

  async getRegistered({ name, email, password }) {
    this.#view.showSubmitLoadingButton();
    try {
      const response = await this.#model.getRegistered({
        name,
        email,
        password,
      });

      if (!response.ok) {
        console.error('getRegistered: response:', response);
        this.#view.registeredFailed(response.message);
        return;
      }

      this.#view.registeredSuccessfully(response.message, response.data);
    } catch (error) {
      console.error('getRegistered: error:', error);
      this.#view.registeredFailed(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }

  async initialStory() {
    this.#view.showLoading();
    try {
      const response = await this.#model.getAllReports();
      console.log('initialStory: API response:', response);

      if (!response.ok) {
        console.error('initialStory: API error response:', response);
        this.#view.populateReportsListError(response.message);
        return;
      }

      if (!response.listStory) {
        console.error('No stories found in API response');
        this.#view.populateReportsListEmpty('No stories available from API');
        return;
      }

      const bookmarkedStories = await getAllBookmarks();
      const bookmarkedIds = new Set(
        Array.isArray(bookmarkedStories)
          ? bookmarkedStories.map(story => story.id)
          : []
      );

      const stories = await Promise.all(
        response.listStory.map(async story => {
          const isBookmarked = bookmarkedIds.has(story.id);
          let photoBase64 = null;

          try {
            photoBase64 = await toBase64(story.photoUrl);
          } catch (error) {
            console.warn(
              `Failed to convert image to base64 for story ID ${story.id}:`,
              error
            );
          }

          return {
            ...story,
            isBookmarked,
            photoBase64,
          };
        })
      );

      console.log(
        'initialStory: Processed stories (with bookmark status):',
        stories
      );
      this.#view.populateReportsList(response.message, stories);
    } catch (error) {
      console.error('initialStory: error:', error);
      if (!navigator.onLine) {
        this.#view.populateReportsListEmpty(
          'Unable to load stories (offline mode).'
        );
      } else {
        this.#view.populateReportsListError(error.message);
      }
    } finally {
      // this.#view.hideLoading(); // Already removed
    }
  }

  async postNewStory({ description, photo, lat, lon }) {
    this.#view.showSubmitLoadingButton();
    try {
      const data = { description, photo, lat, lon };
      const response = await this.#model.TambahData(data);

      if (!response.ok) {
        console.error('TambahData: response:', response);
        this.#view.storeFailed(response.message || 'Failed to add story');
        return;
      }

      this.#view.storeSuccessfully(
        response.message || 'Story added successfully',
        response.data
      );
    } catch (error) {
      console.error('TambahData: error:', error);
      this.#view.storeFailed(error.message || 'An error occurred');
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }

  async getDetailStory(id) {
    this.#view.showDetailLoading();

    try {
      const response = await this.#model.getStoryById(id);
      console.log('API Response in getDetailStory:', response);

      if (!response.ok) {
        throw new Error(
          response.message || 'Failed to fetch story from server'
        );
      }

      let story = response.data || response.story || response;
      if (!story || Object.keys(story).length === 0) {
        throw new Error('No story data available');
      }

      this.#view.storeSuccessfully(response.message || 'Success', story);
      this.#view.StoryDetail(story);

      if (story.lat && story.lon) {
        this.#view.initialMap(story.lat, story.lon);
      }
    } catch (error) {
      console.error('getDetailStory: error occurred:', error);

      try {
        const offlineStory = await getBookmark(id);
        if (offlineStory) {
          console.warn('Fallback: loaded story from IndexedDB:', offlineStory);
          this.#view.storeSuccessfully(
            'Loaded from offline bookmark',
            offlineStory
          );
          this.#view.StoryDetail(offlineStory);

          if (offlineStory.lat && offlineStory.lon) {
            this.#view.initialMap(offlineStory.lat, offlineStory.lon);
          }
        } else {
          this.#view.storeFailed(
            'You can only view story details offline if they were bookmarked earlier.'
          );
        }
      } catch (fallbackError) {
        console.error(
          'getDetailStory: fallback to IndexedDB failed:',
          fallbackError
        );
        this.#view.storeFailed(fallbackError.message || 'An error occurred');
      }
    } finally {
      this.#view.hideDetailLoading();
    }
  }

  async initialBookmark() {
    this.#view.showReportsListLoading();

    try {
      const bookmarkedReports = await getAllBookmarks();
      const message = 'Successfully retrieved saved reports from offline mode.';
      this.#view.populateBookmarkedReports(message, bookmarkedReports);
    } catch (error) {
      console.error('initialBookmark: error:', error);
      this.#view.populateBookmarkedReportsError(error.message);
    } finally {
      this.#view.hideReportsListLoading();
    }
  }

  async toggleBookmark(story, isBookmarked) {
    try {
      console.log(
        'toggleBookmark: Toggling bookmark for story:',
        story.id,
        'isBookmarked (before toggle):',
        isBookmarked
      );
      let success = false;

      if (isBookmarked) {
        await deleteBookmark(story.id);
        console.log('toggleBookmark: Deleted from IndexedDB:', story.id);
        success = true;
      } else {
        // Add to IndexedDB
        const storyToSave = {
          id: story.id,
          name: story.name,
          description: story.description,
          photoUrl: story.photoUrl,
          createdAt: story.createdAt,
          location: story.location || {},
          lat: story.lat,
          lon: story.lon,
        };
        await addBookmark(storyToSave);
        console.log('toggleBookmark: Added to IndexedDB:', story.id);
        success = true;
      }

      return success;
    } catch (error) {
      console.error('toggleBookmark: IndexedDB operation failed:', error);
      return false;
    }
  }
}

async function reportMapper(report) {
  const lat = report.lat;
  const lon = report.lon;

  let placeName = 'Unknown location';

  if (lat !== null && lat !== undefined && lon !== null && lon !== undefined) {
    try {
      placeName = await getPlaceNameByCoordinate(lat, lon);
    } catch (error) {
      console.error('Error getting place name:', error);
      placeName = 'Unknown location';
    }
  }

  return {
    ...report,
    location: {
      latitude: lat || null,
      longitude: lon || null,
      placeName,
    },
  };
}

async function getPlaceNameByCoordinate(lat, lon) {
  return `Lokasi: ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

const toBase64 = async url => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('toBase64 failed for url:', url, error);
    return null;
  }
};
