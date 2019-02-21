/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
function sanitizeArtist(a) {
  if (a.indexOf('(') > -1 && a.indexOf(')') < 0) {
    a = a.replace('(', '');
  } else if (a.indexOf(')') > -1 && a.indexOf('(') < 0) {
    a = a.replace(')', '');
  }
  if (a.indexOf('[') > -1 && a.indexOf(']') < 0) {
    a = a.replace('[', '');
  } else if (a.indexOf(']') > -1 && a.indexOf('[') < 0) {
    a = a.replace(']', '');
  }
  return a.replace(/^\s+/, '').replace(/\s+$/, '');
}

function tokenizeSong(doc) {
  const featuringSeparator = ['Featuring ', 'featuring ', 'Feat.', 'feat.', 'Feat ', 'feat ', 'Ft.', 'ft.', 'Ft ', 'ft ', 'F/', 'f/'];
  let finalArtists = [];
  let artists;
  let realTitle = doc.title;
  for (let i = 0; i < featuringSeparator.length; i++) {
    const spl = doc.artist.split(featuringSeparator[i], 2);
    if (spl.length === 2) {
      artists = spl[1].split(',');
      const lastartist = artists.pop();
      artists = artists.concat(lastartist.split(/ And | & /));
      artists.unshift(spl[0].replace(/^\s+/, '').replace(/\s+$/, ''));
      finalArtists = artists.map(sanitizeArtist);
      break;
    }
  }
  if (!finalArtists.length) {
    finalArtists.push(sanitizeArtist(doc.artist));
  }

  for (let i = 0; i < featuringSeparator.length; i++) {
    const spl = doc.title.split(featuringSeparator[i], 2);
    if (spl.length === 2) {
      realTitle = spl[0].replace(/\s+$/, '');
      artists = spl[1].split(',');
      let lastItem = artists.pop();
      if (lastItem.substr(-1) === ']' && lastItem.indexOf('[') === -1) {
        lastItem = lastItem.slice(0, -1);
        if (realTitle.lastIndexOf('[') === (realTitle.length - 1)) {
          realTitle = realTitle.substr(0, realTitle.length - 2);
        } else {
          realTitle += ']';
        }
      } else if (lastItem.substr(-1) === ')' && lastItem.indexOf('(') === -1) {
        lastItem = lastItem.slice(0, -1);
        if (realTitle.lastIndexOf('(') === (realTitle.length - 1)) {
          realTitle = realTitle.substr(0, realTitle.length - 2);
        } else {
          realTitle += ')';
        }
      }

      artists = artists.concat(lastItem.split(/ And | & /))
        // eslint-disable-next-line no-loop-func
        .forEach((v) => {
          v = sanitizeArtist(v);
          if (finalArtists.indexOf(v) < 0) {
            finalArtists.push(v);
          }
        });
      break;
    }
  }
  artists = [];
  for (let i = 0; i < finalArtists.length; i++) {
    if (artists.indexOf(finalArtists[i]) === -1) {
      artists.push(finalArtists[i]);
    }
  }
  return { title: realTitle, artists };
}

exports.tokenize = tokenizeSong;
