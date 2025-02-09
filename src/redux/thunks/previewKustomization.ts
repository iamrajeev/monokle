import {ipcRenderer} from 'electron';
import {createAsyncThunk} from '@reduxjs/toolkit';
import {SetPreviewDataPayload} from '@redux/reducers/main';
import {AppDispatch, RootState} from '@redux/store';
import {ROOT_FILE_ENTRY} from '@constants/constants';
import path from 'path';
import log from 'loglevel';
import {createRejectionWithAlert, createPreviewResult} from '@redux/thunks/utils';
import {AppConfig} from '@models/appconfig';

/**
 * Thunk to preview kustomizations
 */

export const previewKustomization = createAsyncThunk<
  SetPreviewDataPayload,
  string,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>('main/previewKustomization', async (resourceId, thunkAPI) => {
  const state = thunkAPI.getState().main;
  const appConfig = thunkAPI.getState().config;
  const resource = state.resourceMap[resourceId];
  if (resource && resource.filePath) {
    const rootFolder = state.fileMap[ROOT_FILE_ENTRY].filePath;
    const folder = path.join(rootFolder, resource.filePath.substr(0, resource.filePath.lastIndexOf(path.sep)));

    log.info(`previewing ${resource.id} in folder ${folder}`);
    const result = await runKustomize(folder, appConfig);

    if (result.error) {
      return createRejectionWithAlert(thunkAPI, 'Kustomize Error', result.error);
    }

    if (result.stdout) {
      return createPreviewResult(result.stdout, resource.id, 'Kustomize Preview', state.resourceRefsProcessingOptions);
    }
  }

  return {};
});

/**
 * Invokes kustomize in main thread
 */

function runKustomize(folder: string, appConfig: AppConfig): any {
  return new Promise(resolve => {
    ipcRenderer.once('kustomize-result', (event, arg) => {
      resolve(arg);
    });
    ipcRenderer.send('run-kustomize', {folder, kustomizeCommand: appConfig.settings.kustomizeCommand});
  });
}
