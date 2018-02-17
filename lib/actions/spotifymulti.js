'use strict';

function getSpotifyMetadata(uri, serviceType) {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="00030020${uri}" restricted="true"><upnp:class>object.item.audioItem.musicTrack</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token</desc></item></DIDL-Lite>`;
}

function spotify(player, [action, index, ...spotifyUris]) {
  const encodedSpotifyUris = spotifyUris.map((uri) => encodeURIComponent(uri));
  const sid = player.system.getServiceId('Spotify');
  const serviceType = player.system.getServiceType('Spotify');
  index = parseInt(index);

  const uris = [];

  spotifyUris.forEach(function(spotifyUri) {
    const encodedSpotifyUri = encodeURIComponent(spotifyUri);
    let uri;

    //check if current uri is either a track or a playlist/album
    // TODO: enable playing albums
    // if (spotifyUri.startsWith('spotify:track:')) {
    if (true) {
      uri = `x-sonos-spotify:${encodedSpotifyUri}?sid=${sid}&flags=8224&sn=2`;
    } else {
      uri = `x-rincon-cpcontainer:0006206c${encodedSpotifyUri}`;
    }

    var metadata = getSpotifyMetadata(encodedSpotifyUri, serviceType);
    uris.push([uri, metadata]);
  });

  if (action == 'queue') {
    // default index should be 0 to queue at end
    if (index) {
      return player.coordinator.addMultipleURIsToQueue(uris, '', '', false, index);
    } else {
      return player.coordinator.addMultipleURIsToQueue(uris, '', '', false);
    }
  } else if (action == 'now') {
    var nextTrackNo = player.coordinator.state.trackNo + 1;
    let promise = Promise.resolve();
    if (player.coordinator.avTransportUri.startsWith('x-rincon-queue') === false) {
      promise = promise.then(() => player.coordinator.setAVTransport(`x-rincon-queue:${player.coordinator.uuid}#0`));
    }

    return promise.then(() => {
      return player.coordinator.addMultipleURIsToQueue(uris, '', '', true, nextTrackNo)
        .then((addToQueueStatus) => player.coordinator.trackSeek(addToQueueStatus.firsttracknumberenqueued))
        .then(() => player.coordinator.play());
    });
  } else if (action == 'next') {
    var nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addMultipleURIsToQueue(uris, '', '', true, nextTrackNo);
  }
}

module.exports = function (api) {
  api.registerAction('spotifymulti', spotify);
}
