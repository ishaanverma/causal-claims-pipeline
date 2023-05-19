export const API_URL = process.env.NODE_ENV === 'production' ? 'https://mindsgpu02.isi.edu:5020/api' : 'http://localhost:12550/api';
export const SOCKET_URL = process.env.NODE_ENV === 'production' ? 'https://mindsgpu02.isi.edu:5020' : 'http://localhost:12550';
