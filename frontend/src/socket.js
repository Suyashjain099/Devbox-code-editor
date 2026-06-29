import { io } from 'socket.io-client'

const codingUrl = import.meta.env.VITE_CODING_URL || `http://${window.location.hostname}:9000`;
const socket = io(codingUrl);

export default socket;