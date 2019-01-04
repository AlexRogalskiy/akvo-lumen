import Immutable from 'immutable';
import * as constants from '../constants/raster';
import * as visualisationActions from './visualisation';
import { hideModal } from './activeModal';
import * as api from '../utilities/api';
import {
  addEntitiesToCollection,
  addTemporaryEntitiesToCollection,
  removeTemporaryEntitiesFromCollection,
} from './collection';

/*
 * Fetch a raster by id
 * fetchRaster(id)
 * Actions:
 * - FETCH_RASTER_REQUEST { id }
 * - FETCH_RASTER_SUCCESS { raster }
 * - FETCH_RASTER_FAILURE { error, id }
 */
function fetchRasterRequest(id) {
  return {
    type: constants.FETCH_RASTER_REQUEST,
    id,
  };
}

function fetchRasterSuccess(raster) {
  return {
    type: constants.FETCH_RASTER_SUCCESS,
    raster,
  };
}

function fetchRasterFailure(error, id) {
  return {
    type: constants.FETCH_RASTER_FAILURE,
    id,
  };
}

export function fetchRaster(id) {
  return (dispatch) => {
    dispatch(fetchRasterRequest(id));
    return api
      .get(`/api/rasters/${id}`)
      .then(({ body }) => {
        const immutableRaster = Immutable.fromJS(body);
        dispatch(fetchRasterSuccess(immutableRaster));
        return immutableRaster;
      })
      .catch(error => dispatch(fetchRasterFailure(error, id)));
  };
}

export function ensureRasterFullyLoaded(id) {
  return (dispatch, getState) => {
    const { rasters } = getState().library;
    if (rasters == null || rasters[id] == null) {
      return dispatch(fetchRaster(id));
    }
    return Promise.resolve(rasters[id]);
  };
}

export function updateRasterUploadStatus(status) {
  return {
    type: constants.UPDATE_UPLOAD_STATUS,
    uploadRunning: status,
  };
}

/*
 * Raster import
 * importRaster(dataSource)
 * Actions:
 * IMPORT_RASTER_REQUEST
 * IMPORT_RASTER_SUCCESS
 * IMPORT_RASTER_FAILURE
 */

function importRasterPending(importId, name) {
  const now = Date.now();
  return {
    type: constants.IMPORT_RASTER_PENDING,
    raster: Immutable.fromJS({
      id: importId,
      type: 'raster',
      status: 'PENDING',
      name,
      created: now,
      modified: now,
    }),
  };
}

function importRasterFailure(importId, reason) {
  return {
    type: constants.IMPORT_RASTER_FAILURE,
    importId,
    reason,
    modified: Date.now(),
  };
}

function importRasterSuccess(rasterId, importId, collectionId) {
  return (dispatch) => {
    dispatch(fetchRaster(rasterId));
    dispatch({
      type: constants.IMPORT_RASTER_SUCCESS,
      rasterId,
      importId,
    });
    if (collectionId) {
      dispatch(removeTemporaryEntitiesFromCollection(importId, collectionId));
      dispatch(addEntitiesToCollection(rasterId, collectionId));
    }
  };
}

function pollRasterImportStatus(importId, name, collectionId) {
  return (dispatch) => {
    dispatch(importRasterPending(importId, name, collectionId));
    if (collectionId) {
      dispatch(addTemporaryEntitiesToCollection(importId, collectionId));
    }
    api
      .get(`/api/job_executions/${importId}`)
      .then(({ body: { status, reason, rasterId } }) => {
        if (status === 'PENDING') {
          setTimeout(
            () => dispatch(pollRasterImportStatus(importId, name, collectionId)),
            constants.POLL_INTERVAL
          );
        } else if (status === 'FAILED') {
          dispatch(importRasterFailure(importId, reason, collectionId));
        } else if (status === 'OK') {
          dispatch(importRasterSuccess(rasterId, importId, collectionId));
        }
      })
      .catch(error => dispatch(error));
  };
}

function importRasterRequest(dataSource, collectionId) {
  return {
    type: constants.IMPORT_RASTER_REQUEST,
    dataSource,
    collectionId,
  };
}

export function clearImport() {
  return {
    type: constants.CLEAR_IMPORT,
  };
}

export function importRaster(dataSource, collectionId) {
  return (dispatch) => {
    dispatch(importRasterRequest(dataSource, collectionId));
    api
      .post('/api/rasters', dataSource)
      .then(({ body: { importId } }) => {
        dispatch(pollRasterImportStatus(importId, dataSource.name, collectionId));
        dispatch(hideModal());
        dispatch(clearImport());
      });
  };
}

// Currently only name
export function saveRasterSettings(id, { name }) {
  return {
    type: constants.SAVE_SETTINGS,
    raster: {
      id,
      name,
    },
  };
}

// Only name for now.
export function defineRasterSettings({ name }) {
  return {
    type: constants.DEFINE_RASTER_SETTINGS,
    raster: { name },
  };
}

export function selectDataSource(dataSource) {
  return {
    type: constants.SELECT_DATA_SOURCE,
    dataSource,
  };
}

export function nextPage() {
  return {
    type: constants.NEXT_PAGE,
  };
}

export function previousPage() {
  return {
    type: constants.PREVIOUS_PAGE,
  };
}

export function defineDataSource(dataSource) {
  return {
    type: constants.DEFINE_DATA_SOURCE,
    dataSource,
  };
}

export function fetchRastersSuccess(rasters) {
  return {
    type: constants.FETCH_RASTERS_SUCCESS,
    rasters,
  };
}

/* Delete raster actions */

function deleteRasterRequest(id) {
  return {
    type: constants.DELETE_RASTER_REQUEST,
    id,
  };
}

/* Should only remove the raster from the redux store.
   To delete a raster use deleteRaster istead */
function removeRaster(id) {
  return {
    type: constants.REMOVE_RASTER,
    id,
  };
}

function deleteRasterSuccess(id) {
  return (dispatch, getState) => {
    dispatch(removeRaster(id));
    const visualisations = getState().library.visualisations;
    Object.keys(visualisations).forEach((visualisationId) => {
      if (visualisations[visualisationId].rasterId === id) {
        dispatch(visualisationActions.removeVisualisation(visualisationId));
      }
    });
  };
}

function deleteRasterFailure(id, error) {
  return {
    type: constants.DELETE_RASTER_FAILURE,
    id,
    error,
  };
}

export function deleteRaster(id) {
  return (dispatch) => {
    dispatch(deleteRasterRequest(id));
    api
      .del(`/api/rasters/${id}`)
      .then(() => dispatch(deleteRasterSuccess(id)))
      .catch(error => dispatch(deleteRasterFailure(id, error)));
  };
}

function deletePendingRasterSuccess(id) {
  return (dispatch) => {
    dispatch(removeRaster(id));
  };
}

function deletePendingRasterFailure(id, error) {
  return {
    type: constants.DELETE_RASTER_FAILURE,
    id,
    error,
  };
}

export function deletePendingRaster(id) {
  return (dispatch) => {
    dispatch(deleteRasterRequest(id));
    api
      .del(`/api/job_executions/${id}`)
      .then(() => dispatch(deletePendingRasterSuccess(id)))
      .catch(error => dispatch(deletePendingRasterFailure(id, error)));
  };
}
