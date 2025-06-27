import '../styles/main.css';
import { getLogout } from './utils/auth';
import Camera from './utils/camera';
import App from './pages/app';
import { initNotificationButton } from './utils/notification';

document.addEventListener('DOMContentLoaded', async () => {
  toggleNavbarVisibility();
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  const handleNavigation = async () => {
    await app.renderPage();
    toggleNavbarVisibility();

    if (location.hash === '#/logout') {
      const confirmLogout = confirm('Apakah kamu yakin ingin keluar?');

      if (confirmLogout) {
        getLogout();
        window.location.hash = '/login';
      } else {
        window.history.back();
      }
    }

    Camera.stopAllStreams();
  };

  window.addEventListener('hashchange', handleNavigation);
  window.addEventListener('navigate', handleNavigation);

  const mainContent = document.querySelector('#main-content');
  const skipLink = document.querySelector('.skip-to-content');

  skipLink.addEventListener('click', function (event) {
    event.preventDefault();
    skipLink.blur();
    mainContent.focus();
    mainContent.scrollIntoView();
  });

  await initNotificationButton();
});

function toggleNavbarVisibility() {
  const navbar = document.querySelector('.main-header');
  if (!navbar) return;

  if (location.hash === '#/login' || location.hash === '#/register') {
    navbar.style.display = 'none';
  } else {
    navbar.style.display = 'flex';
  }
}
