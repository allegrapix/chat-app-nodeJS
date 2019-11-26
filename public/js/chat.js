const socket = io();
const chatInput = document.querySelector('#chatInput');
const submitBTN = document.querySelector('#submitBtn');
const msgForm = document.querySelector('#msgForm');
const locationBTN = document.querySelector('#sendLocation');
const messages = document.querySelector('#messages');
const sidebar = document.querySelector('#sidebar');

const msgTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
  // Get the new message
  const $newMessage = messages.lastElementChild;

  // Get the height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = messages.offsetHeight;

  // Height of messages container
  const contentHeight = messages.scrollHeight;

  // How far has the user scrolled
  const scrollOffset = messages.scrollTop + visibleHeight;
  
  if (contentHeight - newMessageHeight <= scrollOffset) {
    messages.scrollTop = messages.scrollHeight;
  }
}

socket.on('message', message => {
  const html = Mustache.render(msgTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format('h:mm A')
  });
  messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on('locationMessage', (mapUrl) => {
  console.log(mapUrl);
  const html = Mustache.render(locationTemplate, {
    username: mapUrl.username,
    url: mapUrl.url,
    createdAt: moment(mapUrl.createdAt).format('h:mm A')
  });
  messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  });
  sidebar.innerHTML = html;
});

msgForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBTN.setAttribute('disabled', 'disabled');
  socket.emit('messageSent', chatInput.value, (error) => {
    submitBTN.removeAttribute('disabled', 'disabled');
    chatInput.value = '';
    chatInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log('Message delivered');
  });
});

locationBTN.addEventListener('click', () => {
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser');
  }
  locationBTN.setAttribute('disabled', 'disabled');
  navigator.geolocation.getCurrentPosition((position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }
    socket.emit('sendLocation', location, (msg) => {
      locationBTN.removeAttribute('disabled', 'disabled');
      if (msg) {
        console.log(msg);
      }
    });
  });
});

socket.emit('join', { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = '/';
  }
});
