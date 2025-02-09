import {Button, Checkbox, Divider, Input, InputNumber, Select, Tooltip} from 'antd';
import {ipcRenderer} from 'electron';
import React, {useEffect, useRef, useState} from 'react';
import {useDebounce} from 'react-use';
import styled from 'styled-components';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {
  updateFileIncludes,
  updateFolderReadsMaxDepth,
  updateHelmPreviewMode,
  updateKubeconfig,
  updateKustomizeCommand,
  updateLoadLastFolderOnStartup,
  updateScanExcludes,
} from '@redux/reducers/appConfig';
import {updateShouldOptionalIgnoreUnsatisfiedRefs} from '@redux/reducers/main';
import {toggleSettings} from '@redux/reducers/ui';
import {isInClusterModeSelector} from '@redux/selectors';

// import {Themes, TextSizes, Languages} from '@models/appconfig';
import FilePatternList from '@molecules/FilePatternList';

import Drawer from '@components/atoms/Drawer';

import {
  AddExclusionPatternTooltip,
  AddInclusionPatternTooltip,
  AutoLoadLastFolderTooltip,
  HelmPreviewModeTooltip,
  KubeconfigPathTooltip,
  KustomizeCommandTooltip,
} from '@constants/tooltips';

import {useFocus} from '@utils/hooks';

const StyledDiv = styled.div`
  margin-bottom: 20px;
`;

const StyledSpan = styled.span`
  font-weight: 500;
  font-size: 20px;
  display: block;
  margin-bottom: 6px;
`;

const StyledButton = styled(Button)`
  margin-top: 10px;
`;

const HiddenInput = styled.input`
  display: none;
`;

const StyledSelect = styled(Select)`
  width: 100%;
`;

const SettingsDrawer = () => {
  const dispatch = useAppDispatch();

  const isSettingsOpened = Boolean(useAppSelector(state => state.ui.isSettingsOpen));
  const resourceRefsProcessingOptions = useAppSelector(state => state.main.resourceRefsProcessingOptions);
  const appConfig = useAppSelector(state => state.config);
  const uiState = useAppSelector(state => state.ui);
  const kubeconfig = useAppSelector(state => state.config.kubeconfigPath);
  const folderReadsMaxDepth = useAppSelector(state => state.config.folderReadsMaxDepth);
  const isInClusterMode = useAppSelector(isInClusterModeSelector);
  const [currentFolderReadsMaxDepth, setCurrentFolderReadsMaxDepth] = useState<number>(5);
  const [currentKubeConfig, setCurrentKubeConfig] = useState<string>('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [inputRef, focusInput] = useFocus<Input>();

  const isEditingDisabled = uiState.isClusterDiffVisible || isInClusterMode;

  useEffect(() => {
    setCurrentFolderReadsMaxDepth(folderReadsMaxDepth);
  }, [folderReadsMaxDepth]);

  useDebounce(
    () => {
      if (currentFolderReadsMaxDepth !== folderReadsMaxDepth) {
        dispatch(updateFolderReadsMaxDepth(currentFolderReadsMaxDepth));
      }
    },
    500,
    [currentFolderReadsMaxDepth]
  );

  const toggleSettingsDrawer = () => {
    dispatch(toggleSettings());
  };

  const onChangeFileIncludes = (patterns: string[]) => {
    dispatch(updateFileIncludes(patterns));
  };

  const onChangeScanExcludes = (patterns: string[]) => {
    dispatch(updateScanExcludes(patterns));
  };

  // const onChangeTheme = (e: RadioChangeEvent) => {
  //   if (e.target.value) {
  //     dispatch(updateTheme(e.target.value));
  //   }
  // };

  const onChangeHelmPreviewMode = (selectedHelmPreviewMode: any) => {
    if (selectedHelmPreviewMode === 'template' || selectedHelmPreviewMode === 'install') {
      dispatch(updateHelmPreviewMode(selectedHelmPreviewMode));
    }
  };

  const onChangeKustomizeCommand = (selectedKustomizeCommand: any) => {
    if (selectedKustomizeCommand === 'kubectl' || selectedKustomizeCommand === 'kustomize') {
      dispatch(updateKustomizeCommand(selectedKustomizeCommand));
    }
  };

  const onChangeLoadLastFolderOnStartup = (e: any) => {
    dispatch(updateLoadLastFolderOnStartup(e.target.checked));
  };

  const setShouldIgnoreOptionalUnsatisfiedRefs = (e: any) => {
    dispatch(updateShouldOptionalIgnoreUnsatisfiedRefs(e.target.checked));
  };

  const openFileSelect = () => {
    if (isEditingDisabled) {
      return;
    }
    fileInput && fileInput.current?.click();
  };

  useEffect(() => {
    setCurrentKubeConfig(kubeconfig);
  }, [kubeconfig]);

  useDebounce(
    () => {
      if (currentKubeConfig !== kubeconfig) {
        dispatch(updateKubeconfig(currentKubeConfig));
      }
    },
    1000,
    [currentKubeConfig]
  );

  const onUpdateKubeconfig = (e: any) => {
    if (isEditingDisabled) {
      return;
    }
    let value = e.target.value;
    setCurrentKubeConfig(value);
  };

  const onSelectFile = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (fileInput.current?.files && fileInput.current.files.length > 0) {
      const file: any = fileInput.current.files[0];
      if (file.path) {
        const path = file.path;
        dispatch(updateKubeconfig(path));
      }
    }
  };

  const checkUpdateAvailability = () => {
    ipcRenderer.send('check-update-available');
  };

  const updateApplication = () => {
    ipcRenderer.send('quit-and-install');
  };

  return (
    <Drawer
      width="400"
      noborder="true"
      title="Settings"
      placement="right"
      closable={false}
      onClose={toggleSettingsDrawer}
      visible={isSettingsOpened}
    >
      <StyledDiv>
        <StyledSpan>KUBECONFIG</StyledSpan>
        <Tooltip title={KubeconfigPathTooltip}>
          <Input
            ref={inputRef}
            value={currentKubeConfig}
            onChange={onUpdateKubeconfig}
            disabled={isEditingDisabled}
            onClick={() => focusInput()}
          />
        </Tooltip>
        <StyledButton onClick={openFileSelect} disabled={isEditingDisabled}>
          Browse
        </StyledButton>
        <HiddenInput type="file" onChange={onSelectFile} ref={fileInput} />
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Files: Include</StyledSpan>
        <FilePatternList
          value={appConfig.fileIncludes}
          onChange={onChangeFileIncludes}
          tooltip={AddInclusionPatternTooltip}
          isSettingsOpened={isSettingsOpened}
        />
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Files: Exclude</StyledSpan>
        <FilePatternList
          value={appConfig.scanExcludes}
          onChange={onChangeScanExcludes}
          tooltip={AddExclusionPatternTooltip}
          isSettingsOpened={isSettingsOpened}
        />
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Helm Preview Mode</StyledSpan>
        <Tooltip title={HelmPreviewModeTooltip}>
          <StyledSelect value={appConfig.settings.helmPreviewMode} onChange={onChangeHelmPreviewMode}>
            <Select.Option value="template">Template</Select.Option>
            <Select.Option value="install">Install</Select.Option>
          </StyledSelect>
        </Tooltip>
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Kustomize Command</StyledSpan>
        <Tooltip title={KustomizeCommandTooltip}>
          <StyledSelect value={appConfig.settings.kustomizeCommand} onChange={onChangeKustomizeCommand}>
            <Select.Option value="kubectl">Use kubectl</Select.Option>
            <Select.Option value="kustomize">Use kustomize</Select.Option>
          </StyledSelect>
        </Tooltip>
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>On Startup</StyledSpan>
        <Tooltip title={AutoLoadLastFolderTooltip}>
          <Checkbox checked={appConfig.settings.loadLastFolderOnStartup} onChange={onChangeLoadLastFolderOnStartup}>
            Automatically load last folder
          </Checkbox>
        </Tooltip>
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Maximum folder read recursion depth</StyledSpan>
        <InputNumber min={1} value={currentFolderReadsMaxDepth} onChange={setCurrentFolderReadsMaxDepth} />
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Resource links processing</StyledSpan>
        <Checkbox
          checked={resourceRefsProcessingOptions.shouldIgnoreOptionalUnsatisfiedRefs}
          onChange={setShouldIgnoreOptionalUnsatisfiedRefs}
        >
          Ignore optional unsatisfied links
        </Checkbox>
      </StyledDiv>
      <Divider />
      {/* <StyledDiv>
        <StyledSpan>Theme</StyledSpan>
        <Radio.Group size="large" value={appConfig.settings.theme} onChange={onChangeTheme}>
          <Radio.Button value={Themes.Dark}>Dark</Radio.Button>
          <Radio.Button value={Themes.Light}>Light</Radio.Button>
        </Radio.Group>
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Text Size</StyledSpan>
        <Radio.Group size="large" value={appConfig.settings.textSize}>
          <Radio.Button value={TextSizes.Large}>Large</Radio.Button>
          <Radio.Button value={TextSizes.Medium}>Medium</Radio.Button>
          <Radio.Button value={TextSizes.Small}>Small</Radio.Button>
        </Radio.Group>
      </StyledDiv>
      <StyledDiv>
        <StyledSpan>Language</StyledSpan>
        <Radio.Group size="large" value={appConfig.settings.language}>
          <Space direction="vertical">
            <Radio value={Languages.English}>English</Radio>
          </Space>
        </Radio.Group>
      </StyledDiv> */}
    </Drawer>
  );
};

export default SettingsDrawer;
