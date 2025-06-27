import HomePage from '../pages/home/homePage';
import NewPage from '../pages/addStories/addStoriesPage';
import LoginPage from '../pages/auth/login/loginPage';
import RegisterPage from '../pages/auth/register/registerPage';
import DetailPage from '../pages/detail/detailPage';
import {
  checkAuthenticatedRoute,
  checkUnauthenticatedRouteOnly,
} from '../utils/auth';
import BookmarkPage from '../pages/bookmark/bookmarkPage';

const routes = {
  '/login': () => checkUnauthenticatedRouteOnly(new LoginPage()),
  '/register': () => checkUnauthenticatedRouteOnly(new RegisterPage()),

  '/': () => checkAuthenticatedRoute(new HomePage()),
  '/tambah': () => checkAuthenticatedRoute(new NewPage()),
  '/stories/:id': () => checkAuthenticatedRoute(new DetailPage()),
  '/bookmark': () => checkAuthenticatedRoute(new BookmarkPage()),
};

export default routes;
