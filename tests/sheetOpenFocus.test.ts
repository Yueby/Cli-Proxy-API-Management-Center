import { describe, expect, test } from 'bun:test';
import { prepareSheetForOpen } from '../src/components/ui/Sheet/Sheet';

describe('sheet opening focus', () => {
  test('resets body scrolling and focuses without scrolling it again', () => {
    const body = { scrollTop: 240 };
    let focusOptions: FocusOptions | undefined;
    const target = {
      focus(options?: FocusOptions) {
        focusOptions = options;
      },
    };

    prepareSheetForOpen(body, target);

    expect(body.scrollTop).toBe(0);
    expect(focusOptions).toEqual({ preventScroll: true });
  });
});
