/* eslint-disable no-underscore-dangle */
import Keycloak from 'keycloak-js';
import Raven from 'raven-js';
import Auth0 from 'auth0-js';
import url from 'url';
import * as k from './keycloak';
import * as a0 from './auth0';
import { get } from './api';

const uuidv1 = require('uuid/v1');

let keycloak = null;
let auth0 = null;
let accessToken = null;

function service() {
  if (keycloak) {
    return keycloak;
  }
  return auth0;
}

export function setKeycloak(K) {
  keycloak = K;
}

export function setAuth0(A) {
  auth0 = A;
}

function lib() {
  if (keycloak) {
    return k;
  }
  return a0;
}

export function logout() {
  lib().logout(service());
}

export function token() {
  if (!service()) {
    return Promise.resolve(accessToken);
  }
  return lib().token(service());
}

export function initService(env) {
  const {
    authClientId,
    authProvider,
    authURL,
  } = env;
  let s = null;
  if (authProvider === 'keycloak') {
    s = new Keycloak({
      url: authURL,
      realm: 'akvo',
      clientId: authClientId,
    });
  } else {
    const nonce = uuidv1();
    const state = nonce;
    window.localStorage.setItem(nonce, location.href);
    s = new Auth0.WebAuth({
      domain: url.parse(authURL).host,
      clientID: authClientId,
      redirectUri: `${location.protocol}//${location.host}/auth0_callback`,
      responseType: 'token id_token',
      scope: 'openid email profile',
      audience: `${authURL}/userinfo`,
      connection: 'google-oauth2',
      state,
      nonce,
    });
  }
  return s;
}

export function init(env, s) {
  if (keycloak != null) {
    throw new Error('Keycloak already initialized');
  }
  const { tenant, sentryDSN } = env;
  if (process.env.NODE_ENV === 'production') {
    Raven.config(sentryDSN).install();
    Raven.setExtraContext({ tenant });
  }

  if (env.authProvider === 'keycloak') {
    if (keycloak != null) {
      throw new Error('Keycloak already initialized');
    }
    setKeycloak(s);

    return lib().init(env, service());
  } else if (env.authProvider === 'auth0') {
    auth0 = s;
    auth0.authorize();
    return new Promise(() => null);
  }
  return null;
}

export function initPublic() {
  return get('/env')
    .then(({ body }) => ({ env: body }));
}

export function initExport(providedAccessToken) {
  return Promise.resolve((accessToken = providedAccessToken));
}
