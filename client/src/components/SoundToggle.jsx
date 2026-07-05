import { useEffect, useState } from 'react';
import {
  initSoundManager,
  isSoundEnabled,
  setSoundEnabled,
  loadSoundPreference,
} from '../audio/SoundManager.js';

export default function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    initSoundManager();
    setOn(loadSoundPreference());
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
  }

  return (
    <button
      type="button"
      className={`sound-toggle ${isSoundEnabled() ? 'sound-toggle-on' : ''}`}
      onClick={toggle}
      aria-label={on ? 'Mute sounds' : 'Enable sounds'}
      title={on ? 'Sound on' : 'Sound off'}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}
