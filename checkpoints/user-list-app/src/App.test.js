import { render, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import App from './App';

// Replace the real axios with a fake, so the tests don't need the internet
jest.mock('axios');

const fakeUsers = [
  {
    id: 1,
    name: 'Leanne Graham',
    username: 'Bret',
    email: 'Sincere@april.biz',
    phone: '1-770-736-8031',
    website: 'hildegard.org',
    address: { street: 'Kulas Light', city: 'Gwenborough' },
    company: { name: 'Romaguera-Crona', catchPhrase: 'Multi-layered client-server neural-net' },
  },
  {
    id: 2,
    name: 'Ervin Howell',
    username: 'Antonette',
    email: 'Shanna@melissa.tv',
    phone: '010-692-6593',
    website: 'anastasia.net',
    address: { street: 'Victor Plains', city: 'Wisokyburgh' },
    company: { name: 'Deckow-Crist', catchPhrase: 'Proactive didactic contingency' },
  },
];

beforeEach(() => {
  axios.isCancel.mockReturnValue(false);
});

test('fetches the users with axios and shows them', async () => {
  axios.get.mockResolvedValue({ data: fakeUsers });
  render(<App />);

  expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  expect(await screen.findByText('Leanne Graham')).toBeInTheDocument();
  expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
  expect(screen.getByText('@Bret')).toBeInTheDocument();
  expect(screen.getByText('2 of 2 users')).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users', expect.any(Object));
});

test('filters the list with the search box', async () => {
  axios.get.mockResolvedValue({ data: fakeUsers });
  render(<App />);
  await screen.findByText('Leanne Graham');

  fireEvent.change(screen.getByLabelText(/search users/i), { target: { value: 'wisoky' } });
  expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
  expect(screen.getByText('Ervin Howell')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/search users/i), { target: { value: 'nobody' } });
  expect(screen.getByText(/no user matches/i)).toBeInTheDocument();
});

test('shows an error message when the request fails', async () => {
  axios.get.mockRejectedValue(new Error('Network Error'));
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the users/i);
});
