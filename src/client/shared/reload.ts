// Live reload: when the dev server restarts the stream drops; reload once it's back.
const events = new EventSource('/__reload');
events.onerror = () => {
  events.close();
  const poll = setInterval(() => {
    fetch(location.href, { cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          clearInterval(poll);
          location.reload();
        }
      })
      .catch(() => {});
  }, 500);
};
