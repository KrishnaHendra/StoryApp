import routes from '../routes/routes';
import { getActiveRoute } from '../routes/urlParser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', event => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach(link => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url] ? routes[url]() : null;

    if (!page) {
      this.#content.innerHTML = '<h2>Halaman tidak ditemukan</h2>';
      return;
    }

    const loadContent = async () => {
      this.#content.innerHTML = await page.render();
      void this.#content.offsetWidth;

      if (typeof page.afterRender === 'function') {
        await page.afterRender();
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(loadContent);
    } else {
      await loadContent();
    }
  }
}

export default App;
