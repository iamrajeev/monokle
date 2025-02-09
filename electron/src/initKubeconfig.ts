import path from 'path';

import {setAlert} from '@redux/reducers/alert';
import {setKubeconfigPathValidity, updateKubeconfig} from '@redux/reducers/appConfig';
import {onUserPerformedClickOnClusterIcon} from '@redux/reducers/uiCoach';

import {AlertEnum} from '@models/alert';

import electronStore from '@utils/electronStore';
import {PROCESS_ENV} from '@utils/env';

async function initKubeconfig(store: any, userHomeDir: string) {
  if (PROCESS_ENV.KUBECONFIG) {
    const envKubeconfigParts = PROCESS_ENV.KUBECONFIG.split(path.delimiter);
    if (envKubeconfigParts.length > 1) {
      store.dispatch(updateKubeconfig(envKubeconfigParts[0]));
      store.dispatch(
        setAlert({
          title: 'KUBECONFIG warning',
          message: 'Found multiple configs, selected the first one.',
          type: AlertEnum.Warning,
        })
      );
    } else {
      store.dispatch(updateKubeconfig(PROCESS_ENV.KUBECONFIG));
    }
    return;
  }
  const storedKubeconfig: string | undefined = await electronStore.get('appConfig.kubeconfig');
  const storedIsKubeconfigPathValid: boolean = await electronStore.get('appConfig.isKubeconfigPathValid');
  const hasUserPerformedClickOnClusterIcon: boolean = await electronStore.get(
    'appConfig.hasUserPerformedClickOnClusterIcon'
  );


  if (hasUserPerformedClickOnClusterIcon) {
    store.dispatch(onUserPerformedClickOnClusterIcon());
  }

  if (storedKubeconfig && storedKubeconfig.trim().length > 0) {
    store.dispatch(updateKubeconfig(storedKubeconfig));
    store.dispatch(setKubeconfigPathValidity(storedIsKubeconfigPathValid));
    return;
  }

  store.dispatch(updateKubeconfig(path.join(userHomeDir, `${path.sep}.kube${path.sep}config`)));
  store.dispatch(setKubeconfigPathValidity(true));
}

export default initKubeconfig;
