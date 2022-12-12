/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {act, fireEvent, render, triggerPress, within} from '@react-spectrum/test-utils';
import {Button} from '@react-spectrum/button';
import {defaultTheme} from '@adobe/react-spectrum';
import {Provider} from '@react-spectrum/provider';
import React from 'react';
import {ToastProvider, useToastProvider} from '../';
import userEvent from '@testing-library/user-event';

function RenderToastButton(props = {}) {
  let toastContext = useToastProvider();

  return (
    <div>
      <Button
        onPress={() => toastContext[props.variant || 'neutral']('Toast is default', props)}
        variant="primary">
        Show Default Toast
      </Button>
    </div>
  );
}

function renderComponent(contents) {
  return render(
    <Provider theme={defaultTheme}>
      <ToastProvider>
        {contents}
      </ToastProvider>
    </Provider>
  );
}

function fireAnimationEnd(alert) {
  let e = new Event('animationend', {bubbles: true, cancelable: false});
  e.animationName = 'fade-out';
  fireEvent(alert, e);
}

describe('Toast Provider and Container', function () {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => jest.runAllTimers());
  });

  it('Renders a button that triggers a toast via the provider', () => {
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton />);
    let button = getByRole('button');

    expect(queryByRole('alert')).toBeNull();
    triggerPress(button);

    let region = getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Notifications');

    let alert = getByRole('alert');
    expect(alert).toBeVisible();

    button = within(alert).getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Close');
    triggerPress(button);

    fireAnimationEnd(alert);
    expect(queryByRole('alert')).toBeNull();
  });

  it('should label icon by variant', () => {
    let {getByRole} = renderComponent(<RenderToastButton variant="positive" />);
    let button = getByRole('button');
    triggerPress(button);

    let alert = getByRole('alert');
    let icon = within(alert).getByRole('img');
    expect(icon).toHaveAttribute('aria-label', 'Success');
  });

  it('removes a toast via timeout', () => {
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton timeout={5000} />);
    let button = getByRole('button');

    triggerPress(button);

    let toast = getByRole('alert');
    expect(toast).toBeVisible();

    act(() => jest.advanceTimersByTime(1000));
    expect(toast).not.toHaveAttribute('data-animation', 'exiting');

    act(() => jest.advanceTimersByTime(5000));
    expect(toast).toHaveAttribute('data-animation', 'exiting');

    fireAnimationEnd(toast);
    expect(queryByRole('alert')).toBeNull();
  });

  it('pauses timers when hovering', () => {
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton timeout={5000} />);
    let button = getByRole('button');

    triggerPress(button);

    let toast = getByRole('alert');
    expect(toast).toBeVisible();

    act(() => jest.advanceTimersByTime(1000));
    act(() => userEvent.hover(toast));

    act(() => jest.advanceTimersByTime(7000));
    expect(toast).not.toHaveAttribute('data-animation', 'exiting');

    act(() => userEvent.unhover(toast));

    act(() => jest.advanceTimersByTime(4000));
    expect(toast).toHaveAttribute('data-animation', 'exiting');

    fireAnimationEnd(toast);
    expect(queryByRole('alert')).toBeNull();
  });

  it('pauses timers when focusing', () => {
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton timeout={5000} />);
    let button = getByRole('button');

    triggerPress(button);

    let toast = getByRole('alert');
    expect(toast).toBeVisible();

    act(() => jest.advanceTimersByTime(1000));
    act(() => within(toast).getByRole('button').focus());

    act(() => jest.advanceTimersByTime(7000));
    expect(toast).not.toHaveAttribute('data-animation', 'exiting');

    act(() => within(toast).getByRole('button').blur());

    act(() => jest.advanceTimersByTime(4000));
    expect(toast).toHaveAttribute('data-animation', 'exiting');

    fireAnimationEnd(toast);
    expect(queryByRole('alert')).toBeNull();
  });

  it('renders a toast with an action', () => {
    let onAction = jest.fn();
    let onClose = jest.fn();
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton actionLabel="Action" onAction={onAction} onClose={onClose} />);
    let button = getByRole('button');

    expect(queryByRole('alert')).toBeNull();
    triggerPress(button);

    let alert = getByRole('alert');
    expect(alert).toBeVisible();

    let buttons = within(alert).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Action');
    triggerPress(buttons[0]);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes toast on action', () => {
    let onAction = jest.fn();
    let onClose = jest.fn();
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton actionLabel="Action" onAction={onAction} onClose={onClose} shouldCloseOnAction />);
    let button = getByRole('button');

    expect(queryByRole('alert')).toBeNull();
    triggerPress(button);

    let alert = getByRole('alert');
    expect(alert).toBeVisible();

    let buttons = within(alert).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Action');
    triggerPress(buttons[0]);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(alert).toHaveAttribute('data-animation', 'exiting');
    fireAnimationEnd(alert);
    expect(queryByRole('alert')).toBeNull();
  });

  it('prioritizes toasts based on variant', () => {
    function ToastPriorites(props = {}) {
      let toastContext = useToastProvider();

      return (
        <div>
          <Button
            onPress={() => toastContext.info('Info', props)}
            variant="primary">
            Info
          </Button>
          <Button
            onPress={() => toastContext.negative('Error', props)}
            variant="primary">
            Error
          </Button>
        </div>
      );
    }

    let {getByRole, getAllByRole, queryByRole} = renderComponent(<ToastPriorites />);
    let buttons = getAllByRole('button');

    // show info toast first. error toast should supersede it.

    expect(queryByRole('alert')).toBeNull();
    triggerPress(buttons[0]);

    let alert = getByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Info');

    triggerPress(buttons[1]);
    fireAnimationEnd(alert);

    alert = getByRole('alert');
    expect(alert).toHaveTextContent('Error');

    triggerPress(within(alert).getByRole('button'));
    fireAnimationEnd(alert);

    alert = getByRole('alert');
    expect(alert).toHaveTextContent('Info');

    triggerPress(within(alert).getByRole('button'));
    fireAnimationEnd(alert);
    expect(queryByRole('alert')).toBeNull();

    // again, but with error toast first.

    triggerPress(buttons[1]);
    alert = getByRole('alert');
    expect(alert).toHaveTextContent('Error');

    triggerPress(buttons[0]);
    alert = getByRole('alert');
    expect(alert).toHaveTextContent('Error');

    triggerPress(within(alert).getByRole('button'));
    fireAnimationEnd(alert);

    alert = getByRole('alert');
    expect(alert).toHaveTextContent('Info');

    triggerPress(within(alert).getByRole('button'));
    fireAnimationEnd(alert);
    expect(queryByRole('alert')).toBeNull();
  });

  it('can focus toast region using F6', () => {
    let {getByRole} = renderComponent(<RenderToastButton timeout={5000} />);
    let button = getByRole('button');

    triggerPress(button);

    let toast = getByRole('alert');
    expect(toast).toBeVisible();

    expect(document.activeElement).toBe(button);
    fireEvent.keyDown(button, {key: 'F6'});
    fireEvent.keyUp(button, {key: 'F6'});

    let region = getByRole('region');
    expect(document.activeElement).toBe(region);
  });

  it('should restore focus when a toast exits', () => {
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton />);
    let button = getByRole('button');

    triggerPress(button);

    let toast = getByRole('alert');
    let closeButton = within(toast).getByRole('button');
    act(() => closeButton.focus());

    triggerPress(closeButton);
    fireAnimationEnd(toast);
    expect(queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('should move focus to container when a toast exits and there are more', () => {
    let {getByRole, queryByRole} = renderComponent(<RenderToastButton />);
    let button = getByRole('button');

    triggerPress(button);
    triggerPress(button);

    let toast = getByRole('alert');
    let closeButton = within(toast).getByRole('button');
    triggerPress(closeButton);
    fireAnimationEnd(toast);

    expect(document.activeElement).toBe(getByRole('region'));

    toast = getByRole('alert');
    closeButton = within(toast).getByRole('button');
    triggerPress(closeButton);
    fireAnimationEnd(toast);

    expect(queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
