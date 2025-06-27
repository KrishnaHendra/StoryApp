import AppPresenter from '../../utils/presenter';
import StoryAPI from '../../data/api';

function showFormattedDate(date, locale) {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default class BookmarkPage {
  #presenter = null;

  async render() {
    return `
      <section>
        <div id="bookmark-loading">${generateLoaderAbsoluteTemplate()}</div>
        <div id="reports-list" class="reports-list"></div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new AppPresenter({
      view: this,
      model: StoryAPI,
    });
    this.#presenter.initialBookmark();
  }

  showReportsListLoading() {
    document.getElementById('bookmark-loading').style.display = 'block';
  }

  hideReportsListLoading() {
    document.getElementById('bookmark-loading').style.display = 'none';
  }

  populateBookmarkedReports(message, reports) {
    const container = document.getElementById('reports-list');
    container.innerHTML = '';

    if (!Array.isArray(reports) || reports.length === 0) {
      console.warn(
        'populateBookmarkedReports: No reports to display or invalid data received.',
        reports
      );
      container.innerHTML = generateReportsListEmptyTemplate();
      return;
    }

    reports.forEach(report => {
      const {
        id,
        name = 'Unknown',
        description = '-',
        photoUrl,
        createdAt,
        location = {},
        lat,
        lon,
      } = report;

      const date = createdAt
        ? showFormattedDate(createdAt, 'en-US')
        : 'Date unknown';
      const locationDisplay =
        report.lat !== undefined && report.lon !== undefined
          ? `Latitude: ${report.lat}, Longitude: ${report.lon}`
          : 'Location not available';

      const imageSrc =
        report.photoBase64 || report.photoUrl || 'images/placeholder.jpg';

      container.innerHTML += `
        <div tabindex="0" class="report-item" data-reportid="${id}">
          <img class="report-item__image" src="${imageSrc}" alt="${name}">
          <div class="report-item__body">
            <div class="report-item__main" style="margin-bottom: 0;">
              <h2 class="report-item__title" style="margin-bottom: 0;">${name}</h2>
            </div>
            <div class="report-item__description" style="margin-bottom: 0;">${description}</div>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin: 10px 0;">
              <tr>
                <td colspan="3" style="text-align: center; font-weight: bold; border: 1px solid black; background: #f5f5f5; padding: 5px;">
                  Location
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 5px;">Latitude</td>
                <td style="border: 1px solid black; padding: 5px;">${lat}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 5px;">Longitude</td>
                <td style="border: 1px solid black; padding: 5px;">${lon}</td>
              </tr>
            </table>
            <div class="report-item__actions" style="display: flex;">
              <button 
                class="bookmark-button" 
                data-id="${id}" 
                aria-label="Remove from bookmarks"
                style="
                  flex: 1;
                  padding: 10px;
                  width: 50%;
                  box-sizing: border-box;
                  border: none;
                  cursor: pointer;
                "
              >
                <i class="fas fa-bookmark"></i> Remove from Bookmarks
              </button>

              <a 
                href="#/stories/${id}" 
                class="detail-button"
                style="
                  flex: 1;
                  padding: 10px;
                  width: 50%;
                  box-sizing: border-box;
                  background-color: var(--accent-primary);
                  color: white;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  line-height: 1.5;
                "
              >
                Read More
              </a>
            </div>
          </div>
        </div>
      `;
    });

    const bookmarkButtons = container.querySelectorAll('.bookmark-button');
    bookmarkButtons.forEach(button => {
      button.addEventListener('click', async event => {
        event.preventDefault();

        const id = button.dataset.id;
        const isBookmarked = true;

        const report = reports.find(r => r.id === id);

        if (!report) {
          console.error('Report object not found for ID:', id);
          return;
        }

        try {
          const success = await this.#presenter.toggleBookmark(
            report,
            isBookmarked
          );

          if (success) {
            console.log('Unbookmark successful in IndexedDB:', id);
            const card = button.closest('.report-item');
            card.remove();

            if (container.children.length === 0) {
              container.innerHTML = generateReportsListEmptyTemplate();
            }
          } else {
            console.error('Failed to unbookmark in IndexedDB');
          }
        } catch (error) {
          console.error('Error unbookmarking:', error);
        }
      });
    });
  }

  populateBookmarkedReportsError(message) {
    const container = document.getElementById('reports-list');
    container.innerHTML = generateReportsListErrorTemplate(message);
  }
}

function generateLoaderAbsoluteTemplate() {
  return `<div class="loader loader-absolute"></div>`;
}

function generateReportsListEmptyTemplate() {
  return `
    <div id="reports-list-empty" class="reports-list__empty">
      <h2>No Reports Available</h2>
      <p>Currently, there are no public facility damage reports to display.</p>
    </div>
  `;
}

function generateReportsListErrorTemplate(message) {
  return `
    <div id="reports-list-error" class="reports-list__error">
      <h2>Failed to Load Reports</h2>
      <p>${
        message ||
        'Please try a different network or report this issue to support.'
      }</p>
    </div>
  `;
}
