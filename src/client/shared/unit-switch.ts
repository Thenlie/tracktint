import { isMi, setUnit } from './units.js';

/**
 * Wire up the imperial/metric switch (#unit-switch, #u-mi, #u-km).
 * `onChange` runs after the user toggles; call it yourself for the initial render.
 */
export function initUnitSwitch(onChange: () => void): void {
  const button = document.getElementById('unit-switch') as HTMLButtonElement;
  const miLabel = document.getElementById('u-mi') as HTMLElement;
  const kmLabel = document.getElementById('u-km') as HTMLElement;

  const sync = (): void => {
    button.setAttribute('aria-checked', String(!isMi()));
    miLabel.classList.toggle('on', isMi());
    kmLabel.classList.toggle('on', !isMi());
  };

  button.addEventListener('click', () => {
    setUnit(isMi() ? 'km' : 'mi');
    sync();
    onChange();
  });
  sync();
}
