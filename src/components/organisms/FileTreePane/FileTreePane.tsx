import {Button, Menu, Modal, Row, Skeleton, Tooltip, Tree, Typography} from 'antd';
import {ipcRenderer, shell} from 'electron';
import micromatch from 'micromatch';
import os from 'os';
import path from 'path';
import React, {Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {setAlert} from '@redux/reducers/alert';
import {selectFile, setSelectingFile} from '@redux/reducers/main';
import {closeFolderExplorer, setShouldExpandAllNodes} from '@redux/reducers/ui';
import {isInPreviewModeSelector} from '@redux/selectors';
import {getChildFilePath, getResourcesForPath} from '@redux/services/fileEntry';
import {stopPreview} from '@redux/services/preview';
import store from '@redux/store';
import {setRootFolder} from '@redux/thunks/setRootFolder';

import {AlertEnum} from '@models/alert';
import {FileMapType, ResourceMapType} from '@models/appstate';
import {FileEntry} from '@models/fileentry';

import {MonoPaneTitle, MonoPaneTitleCol, Spinner} from '@atoms';
import FileExplorer from '@atoms/FileExplorer';

import Dots from '@components/atoms/Dots';
import Icon from '@components/atoms/Icon';
import ContextMenu from '@components/molecules/ContextMenu';

import {useFileExplorer} from '@hooks/useFileExplorer';

import {ExclamationCircleOutlined, FolderAddOutlined, ReloadOutlined} from '@ant-design/icons';

import {FILE_TREE_HEIGHT_OFFSET, ROOT_FILE_ENTRY, TOOLTIP_DELAY} from '@constants/constants';
import {BrowseFolderTooltip, ReloadFolderTooltip, ToggleTreeTooltip} from '@constants/tooltips';

import {DeleteEntityCallback, deleteEntity, getFileStats} from '@utils/files';
import {uniqueArr} from '@utils/index';

import Colors, {BackgroundColors, FontColors} from '@styles/Colors';

import AppContext from '@src/AppContext';

interface TreeNode {
  key: string;
  title: React.ReactNode;
  children: TreeNode[];
  highlight: boolean;
  /**
   * Whether the TreeNode has children
   */
  isLeaf?: boolean;
  icon?: React.ReactNode;
}

const StyledNumberOfResources = styled(Typography.Text)`
  margin-left: 12px;
`;

const NodeContainer = styled.div`
  position: relative;
`;

const NodeTitleContainer = styled.div`
  padding-right: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const createNode = (fileEntry: FileEntry, fileMap: FileMapType, resourceMap: ResourceMapType) => {
  const resources = getResourcesForPath(fileEntry.filePath, resourceMap);

  const node: TreeNode = {
    key: fileEntry.filePath,
    title: (
      <NodeContainer>
        <NodeTitleContainer>
          <span className={fileEntry.isExcluded ? 'excluded-file-entry-name' : 'file-entry-name'}>
            {fileEntry.name}
          </span>
          {resources.length > 0 ? (
            <StyledNumberOfResources className="file-entry-nr-of-resources" type="secondary">
              {resources.length}
            </StyledNumberOfResources>
          ) : (
            ''
          )}
        </NodeTitleContainer>
      </NodeContainer>
    ),
    children: [],
    highlight: false,
  };

  if (fileEntry.children) {
    if (fileEntry.children.length) {
      node.children = fileEntry.children
        .map(child => fileMap[getChildFilePath(child, fileEntry, fileMap)])
        .filter(childEntry => childEntry)
        .map(childEntry => createNode(childEntry, fileMap, resourceMap));
    }
  } else {
    node.isLeaf = true;
  }

  return node;
};

const FileTreeContainer = styled.div`
  background: ${BackgroundColors.darkThemeBackground};
  width: 100%;
  height: 100%;

  & .ant-tree {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
      'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    font-variant: tabular-nums;
    font-size: 12px;
    font-style: normal;
    font-weight: normal;
    line-height: 22px;
    color: ${FontColors.darkThemeMainFont};
  }
  & .ant-tree-treenode {
    margin-left: 8px;
    background: transparent;
  }
  & .ant-tree-treenode-selected {
    vertical-align: center;
    margin-left: 0px !important;
    border-left: 8px hidden transparent;
    padding-left: 8px;
    padding-bottom: 0px;
    background: ${Colors.selectionGradient} !important;
  }
  & .ant-tree-treenode-selected::before {
    background: ${Colors.selectionGradient} !important;
  }
  & .file-entry-name {
    color: ${Colors.blue10};
  }
  & .ant-tree-treenode-selected .file-entry-name {
    color: ${Colors.blackPure} !important;
  }
  & .ant-tree-treenode-selected .ant-tree-switcher {
    color: ${Colors.blackPure} !important;
  }
  & .ant-tree-treenode-selected .file-entry-nr-of-resources {
    color: ${Colors.blackPure} !important;
  }
  & .ant-tree-treenode::selection {
    background: ${Colors.selectionGradient} !important;
  }
  & .filter-node {
    font-weight: bold;
    background: ${Colors.highlightGradient};
  }
  & .filter-node .file-entry-name {
    color: ${FontColors.resourceRowHighlight} !important;
  }
  .ant-tree.ant-tree-directory .ant-tree-treenode .ant-tree-node-content-wrapper.ant-tree-node-selected {
    color: ${Colors.blackPure} !important;
    font-weight: bold;
  }
  & .ant-tree-iconEle {
    flex-shrink: 0;
  }
  & .ant-tree-iconEle .anticon {
    vertical-align: text-bottom;
  }
  & .ant-tree-node-content-wrapper {
    display: flex;
    overflow: hidden;
  }

  & .ant-tree-node-content-wrapper .ant-tree-title {
    overflow: hidden;
    flex-grow: 1;
  }

  & .ant-tree-switcher {
    background: transparent;
  }

  & .excluded-file-entry-name {
    color: ${Colors.grey800};
  }
`;

const NoFilesContainer = styled.div`
  margin-left: 16px;
  margin-top: 10px;
`;

const StyledTreeDirectoryTree = styled(Tree.DirectoryTree)`
  margin-left: 2px;
  margin-top: 10px;

  .ant-tree-switcher svg {
    color: ${props => (props.disabled ? `${Colors.grey800}` : 'inherit')} !important;
  }

  opacity: ${props => (props.disabled ? '70%' : '100%')};
`;

const TitleBarContainer = styled.div`
  display: flex;
  height: 24px;
  justify-content: space-between;
`;

const Title = styled.span`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  padding-right: 10px;
`;

const RightButtons = styled.div`
  display: flex;
  align-items: center;

  button:not(:last-child),
  .ant-tooltip-disabled-compatible-wrapper:not(:last-child) {
    margin-right: 10px;
  }

  .ant-tooltip-disabled-compatible-wrapper {
    margin-bottom: 1px;
  }
`;

const TreeTitleWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  height: 100%;

  & .ant-dropdown-trigger {
    height: inherit;
    margin-right: 10px;
  }
`;

const TreeTitleText = styled.span`
  flex: 1;
  overflow: hidden;
  position: relative;
`;

const StyledSkeleton = styled(Skeleton)`
  margin: 20px;
  width: 90%;
`;

const ReloadButton = styled(Button)``;

const BrowseButton = styled(Button)``;

const SpinnerWrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;

  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  width: 100%;

  @supports (backdrop-filter: blur(10px)) or (--webkit-backdrop-filter: blur(10px)) {
    backdrop-filter: blur(5px);
    --webkit-backdrop-filter: blur(5px);
  }
`;

interface ProcessingEntity {
  processingEntityID?: string;
  processingType?: 'delete';
}

interface TreeItemProps {
  title: React.ReactNode;
  treeKey: string;
  setProcessingEntity: Dispatch<SetStateAction<ProcessingEntity>>;
  processingEntity: ProcessingEntity;
  onDeleting: (args: DeleteEntityCallback) => void;
}

function deleteEntityWizard(entityInfo: {entityAbsolutePath: string}, onOk: () => void, onCancel: () => void) {
  const title = `Are you sure you want to delete "${path.basename(entityInfo.entityAbsolutePath)}"?`;

  Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    onOk() {
      onOk();
    },
    onCancel() {
      onCancel();
    },
  });
}

const TreeItem: React.FC<TreeItemProps> = props => {
  const {title, treeKey, setProcessingEntity, processingEntity, onDeleting} = props;

  const fileMap = useAppSelector(state => state.main.fileMap);
  const [isTitleHovered, setTitleHoverState] = useState(false);

  const relativePath = fileMap[ROOT_FILE_ENTRY].filePath === treeKey ? treeKey.split('/').reverse()[0] : treeKey;

  const absolutePath =
    fileMap[ROOT_FILE_ENTRY].filePath === treeKey
      ? fileMap[ROOT_FILE_ENTRY].filePath
      : `${fileMap[ROOT_FILE_ENTRY].filePath}${treeKey}`;

  const platformFilemanagerNames: {[name: string]: string} = {
    darwin: 'finder',
  };

  const platformFilemanagerName = platformFilemanagerNames[os.platform()] || 'explorer';

  const menu = (
    <Menu>
      <Menu.Item
        onClick={e => {
          e.domEvent.stopPropagation();

          shell.showItemInFolder(absolutePath);
        }}
        key="reveal_in_finder"
      >
        Reveal in {platformFilemanagerName}
      </Menu.Item>
      <Menu.Item
        onClick={e => {
          e.domEvent.stopPropagation();

          navigator.clipboard.writeText(absolutePath);
        }}
        key="copy_full_path"
      >
        Copy path
      </Menu.Item>
      <Menu.Item
        onClick={e => {
          e.domEvent.stopPropagation();

          navigator.clipboard.writeText(relativePath);
        }}
        key="copy_relative_path"
      >
        Copy relative path
      </Menu.Item>
      {/* You would not like to be able to delete the root folder maybe? */}
      {fileMap[ROOT_FILE_ENTRY].filePath !== treeKey ? (
        <Menu.Item
          key="delete_entity"
          onClick={e => {
            e.domEvent.stopPropagation();

            deleteEntityWizard(
              {entityAbsolutePath: absolutePath},
              () => {
                setProcessingEntity({processingEntityID: treeKey, processingType: 'delete'});
                deleteEntity(absolutePath, onDeleting);
              },
              () => {}
            );
          }}
        >
          Delete
        </Menu.Item>
      ) : null}
    </Menu>
  );
  //
  return (
    <TreeTitleWrapper
      onMouseEnter={() => {
        setTitleHoverState(true);
      }}
      onMouseLeave={() => {
        setTitleHoverState(false);
      }}
    >
      <TreeTitleText>{title}</TreeTitleText>
      {processingEntity.processingEntityID === treeKey && processingEntity.processingType === 'delete' ? (
        <SpinnerWrapper>
          <Spinner />
        </SpinnerWrapper>
      ) : null}
      {isTitleHovered && !processingEntity.processingType ? (
        <ContextMenu overlay={menu}>
          <div
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <Dots />
          </div>
        </ContextMenu>
      ) : null}
    </TreeTitleWrapper>
  );
};

const FileTreePane = () => {
  const {windowSize} = useContext(AppContext);
  const windowHeight = windowSize.height;

  const dispatch = useAppDispatch();

  const isInPreviewMode = useSelector(isInPreviewModeSelector);
  const previewLoader = useAppSelector(state => state.main.previewLoader);
  const uiState = useAppSelector(state => state.ui);
  const fileMap = useAppSelector(state => state.main.fileMap);
  const resourceMap = useAppSelector(state => state.main.resourceMap);
  const selectedResourceId = useAppSelector(state => state.main.selectedResourceId);
  const selectedPath = useAppSelector(state => state.main.selectedPath);
  const isSelectingFile = useAppSelector(state => state.main.isSelectingFile);
  const loadLastFolderOnStartup = useAppSelector(state => state.config.settings.loadLastFolderOnStartup);
  const recentFolders = useAppSelector(state => state.config.recentFolders);
  const fileIncludes = useAppSelector(state => state.config.fileIncludes);
  const scanExcludes = useAppSelector(state => state.config.scanExcludes);
  const shouldExpandAllNodes = useAppSelector(state => state.ui.shouldExpandAllNodes);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Array<React.Key>>([]);
  const [highlightNode, setHighlightNode] = useState<TreeNode>();
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const treeRef = useRef<any>();
  const [processingEntity, setProcessingEntity] = useState<ProcessingEntity>({
    processingEntityID: undefined,
    processingType: undefined,
  });

  const isButtonDisabled = !fileMap[ROOT_FILE_ENTRY];

  const {openFileExplorer, fileExplorerProps} = useFileExplorer(
    ({folderPath}) => {
      if (folderPath) {
        setFolder(folderPath);
      }
      setAutoExpandParent(true);
    },
    {isDirectoryExplorer: true}
  );

  const setFolder = useCallback(
    (folder: string) => {
      dispatch(setRootFolder(folder));
    },
    [dispatch]
  );

  const refreshFolder = useCallback(() => {
    setFolder(fileMap[ROOT_FILE_ENTRY].filePath);
  }, [fileMap, setFolder]);

  useEffect(() => {
    const rootEntry = fileMap[ROOT_FILE_ENTRY];
    const treeData = rootEntry && createNode(rootEntry, fileMap, resourceMap);

    setTree(treeData);

    if (shouldExpandAllNodes) {
      setExpandedKeys(Object.keys(fileMap).filter(key => fileMap[key]?.children?.length));
      dispatch(setShouldExpandAllNodes(false));
    }
  }, [resourceMap, fileMap, shouldExpandAllNodes, dispatch]);

  /**
   * This useEffect ensures that the right treeNodes are expanded and highlighted
   * when a resource is selected
   */

  function highlightFilePath(filePath: string) {
    const paths = filePath.split(path.sep);
    const keys: Array<React.Key> = [];

    for (let c = 1; c < paths.length; c += 1) {
      keys.push(paths.slice(0, c + 1).join(path.sep));
    }

    let node: TreeNode | undefined = tree || undefined;
    for (let c = 0; c < keys.length && node; c += 1) {
      node = node.children.find(i => i.key === keys[c]);
    }

    if (node) {
      node.highlight = true;
      treeRef?.current?.scrollTo({key: node.key});

      if (highlightNode) {
        highlightNode.highlight = false;
      }
    }

    setHighlightNode(node);
    setExpandedKeys(prevExpandedKeys => uniqueArr([...prevExpandedKeys, ...Array.from(keys)]));
  }

  useEffect(() => {
    if (selectedResourceId && tree) {
      const resource = resourceMap[selectedResourceId];
      if (resource) {
        const filePath = resource.filePath;
        highlightFilePath(filePath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResourceId, tree]);

  useEffect(() => {
    // removes any highlight when a file is selected
    if (selectedPath && highlightNode) {
      highlightNode.highlight = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath]);

  const onDeleting = (args: {isDirectory: boolean; name: string; err: NodeJS.ErrnoException | null}): void => {
    const {isDirectory, name, err} = args;

    if (err) {
      store.dispatch(
        setAlert({
          title: 'Deleting failed',
          message: `Something went wrong during deleting a ${isDirectory ? 'directory' : 'file'}`,
          type: AlertEnum.Error,
        })
      );
    } else {
      store.dispatch(
        setAlert({
          title: `Successfully deleted a ${isDirectory ? 'directory' : 'file'}`,
          message: `You have successfully deleted ${name} ${isDirectory ? 'directory' : 'file'}`,
          type: AlertEnum.Success,
        })
      );
    }

    /**
     * Deleting is performed immediately.
     * The Ant Tree component is not updated immediately.
     * I show the loader long enough to let the Ant Tree component update.
     */
    setTimeout(() => {
      setProcessingEntity({processingEntityID: undefined, processingType: undefined});
    }, 2000);
  };

  const onSelect = (selectedKeysValue: React.Key[], info: any) => {
    if (!fileIncludes.some(fileInclude => micromatch.isMatch(path.basename(info.node.key), fileInclude))) {
      return;
    }
    if (scanExcludes.some(scanExclude => micromatch.isMatch(path.basename(info.node.key), scanExclude))) {
      return;
    }
    if (info.node.key) {
      if (isInPreviewMode) {
        stopPreview(dispatch);
      }
      dispatch(setSelectingFile(true));
      dispatch(selectFile({filePath: info.node.key}));
    }
  };

  useEffect(() => {
    if (isSelectingFile) {
      dispatch(setSelectingFile(false));
    }
  }, [isSelectingFile, dispatch]);

  useEffect(() => {
    if (uiState.leftMenu.selection === 'file-explorer' && uiState.folderExplorer.isOpen) {
      openFileExplorer();
      dispatch(closeFolderExplorer());
    }
  }, [uiState, dispatch, openFileExplorer]);

  const onExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const onExecutedFrom = useCallback(
    (_, data) => {
      const folder = data.path || (loadLastFolderOnStartup && recentFolders.length > 0 ? recentFolders[0] : undefined);
      if (folder && getFileStats(folder)?.isDirectory()) {
        setFolder(folder);
        setAutoExpandParent(true);
      }
    },
    [loadLastFolderOnStartup, setFolder, recentFolders]
  );

  useEffect(() => {
    ipcRenderer.on('executed-from', onExecutedFrom);
    return () => {
      ipcRenderer.removeListener('executed-from', onExecutedFrom);
    };
  }, [onExecutedFrom]);

  const allTreeKeys = useMemo(() => {
    if (!tree) return [];

    // The root element goes first anyway if tree exists
    const treeKeys: string[] = [tree.key];

    /**
     * Recursively finds all the keys and pushes them into array.
     */
    const recursivelyGetAllTheKeys = (arr: TreeNode[]) => {
      if (!arr) return;

      arr.forEach((data: TreeNode) => {
        const {children} = data;

        if (!children.length) return;

        treeKeys.push(data.key);

        recursivelyGetAllTheKeys(data.children);
      });
    };

    recursivelyGetAllTheKeys(tree?.children);

    return treeKeys;
  }, [tree]);

  const onToggleTree = () => {
    if (!expandedKeys.includes(fileMap[ROOT_FILE_ENTRY].filePath)) {
      return setExpandedKeys(allTreeKeys);
    }

    setExpandedKeys(prevState => (prevState.length ? [] : allTreeKeys));
  };

  return (
    <FileTreeContainer>
      <Row>
        <MonoPaneTitleCol>
          <MonoPaneTitle>
            <TitleBarContainer>
              <Title>File Explorer</Title>
              <RightButtons>
                <Tooltip mouseEnterDelay={TOOLTIP_DELAY} title={BrowseFolderTooltip}>
                  <BrowseButton
                    icon={<FolderAddOutlined />}
                    size="small"
                    type="primary"
                    ghost
                    onClick={openFileExplorer}
                  >
                    {Number(uiState.paneConfiguration.leftWidth.toFixed(2)) < 0.2 ? '' : 'Browse'}
                  </BrowseButton>
                </Tooltip>
                <Tooltip mouseEnterDelay={TOOLTIP_DELAY} title={ReloadFolderTooltip}>
                  <ReloadButton
                    size="small"
                    onClick={refreshFolder}
                    icon={<ReloadOutlined />}
                    type="primary"
                    ghost
                    disabled={isButtonDisabled}
                  />
                </Tooltip>
                <Tooltip mouseEnterDelay={TOOLTIP_DELAY} title={ToggleTreeTooltip}>
                  <Button
                    icon={<Icon name="collapse" color={isButtonDisabled ? '' : Colors.blue6} />}
                    onClick={onToggleTree}
                    type="primary"
                    ghost
                    size="small"
                    disabled={isButtonDisabled}
                  />
                </Tooltip>
              </RightButtons>
            </TitleBarContainer>
          </MonoPaneTitle>
        </MonoPaneTitleCol>
        <FileExplorer {...fileExplorerProps} />
      </Row>
      {uiState.isFolderLoading ? (
        <StyledSkeleton active />
      ) : tree ? (
        <StyledTreeDirectoryTree
          // height is needed to enable Tree's virtual scroll ToDo: Do constants based on the hights of app title and pane title, or get height of parent.
          height={windowHeight && windowHeight > FILE_TREE_HEIGHT_OFFSET ? windowHeight - FILE_TREE_HEIGHT_OFFSET : 0}
          onSelect={onSelect}
          treeData={[tree]}
          ref={treeRef}
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          titleRender={event => {
            return (
              <TreeItem
                treeKey={String(event.key)}
                title={event.title}
                processingEntity={processingEntity}
                setProcessingEntity={setProcessingEntity}
                onDeleting={onDeleting}
                {...event}
              />
            );
          }}
          autoExpandParent={autoExpandParent}
          selectedKeys={[selectedPath || '-']}
          filterTreeNode={node => {
            // @ts-ignore
            return node.highlight;
          }}
          disabled={isInPreviewMode || previewLoader.isLoading}
          showLine
          showIcon={false}
        />
      ) : (
        <NoFilesContainer>
          Get started by selecting a folder containing manifests, kustomizations or Helm Charts.
        </NoFilesContainer>
      )}
    </FileTreeContainer>
  );
};

export default FileTreePane;
