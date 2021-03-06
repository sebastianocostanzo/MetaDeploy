import React from 'react';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

const mockStore = configureStore([]);

export const renderWithRedux = (
  ui,
  initialState = {},
  customStore = mockStore,
) => {
  const store = customStore(initialState);
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    // adding `store` to the returned utilities to allow us
    // to reference it in our tests (just try to avoid using
    // this to test implementation details).
    store,
  };
};

export const reRenderWithRedux = (ui, store, rerender) => ({
  ...rerender(<Provider store={store}>{ui}</Provider>),
});

export const storeWithApi = configureStore([thunk]);
