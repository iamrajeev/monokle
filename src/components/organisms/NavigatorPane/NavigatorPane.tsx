import {Badge} from 'antd';
import {useContext, useMemo} from 'react';
import {useSelector} from 'react-redux';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {openNewResourceWizard} from '@redux/reducers/ui';
import {activeResourcesSelector, isInClusterModeSelector, isInPreviewModeSelector} from '@redux/selectors';

import {ResourceFilterType} from '@models/appstate';
import {HelmValuesFile} from '@models/helm';
import {K8sResource} from '@models/k8sresource';

import {MonoPaneTitle} from '@components/atoms';
import {ResourceFilter, SectionRenderer} from '@components/molecules';
import IconWithPopover from '@components/molecules/IconWithPopover';

import {FilterOutlined, PlusOutlined} from '@ant-design/icons';

import {NAVIGATOR_HEIGHT_OFFSET, ROOT_FILE_ENTRY} from '@constants/constants';

import Colors from '@styles/Colors';

import AppContext from '@src/AppContext';
import HelmChartSectionBlueprint, {HelmChartScopeType} from '@src/navsections/HelmChartSectionBlueprint';
import K8sResourceSectionBlueprint, {K8sResourceScopeType} from '@src/navsections/K8sResourceSectionBlueprint';
import KustomizationSectionBlueprint, {KustomizationScopeType} from '@src/navsections/KustomizationSectionBlueprint';
import UnknownResourceSectionBlueprint, {
  UnknownResourceScopeType,
} from '@src/navsections/UnknownResourceSectionBlueprint';

import ClusterCompareButton from './ClusterCompareButton';
import * as S from './NavigatorPane.styled';
import WarningsAndErrorsDisplay from './WarningsAndErrorsDisplay';

const NavPane: React.FC = () => {
  const dispatch = useAppDispatch();
  const {windowSize} = useContext(AppContext);
  const windowHeight = windowSize.height;
  const navigatorHeight = windowHeight - NAVIGATOR_HEIGHT_OFFSET;

  const fileMap = useAppSelector(state => state.main.fileMap);
  const resourceFilters: ResourceFilterType = useAppSelector(state => state.main.resourceFilter);
  const activeResources = useAppSelector(activeResourcesSelector);

  const isInClusterMode = useSelector(isInClusterModeSelector);
  const isInPreviewMode = useSelector(isInPreviewModeSelector);

  const appliedFilters = useMemo(() => {
    return Object.entries(resourceFilters)
      .map(([key, value]) => {
        return {filterName: key, filterValue: value};
      })
      .filter(filter => filter.filterValue && Object.values(filter.filterValue).length);
  }, [resourceFilters]);

  const isFolderOpen = useMemo(() => {
    return Boolean(fileMap[ROOT_FILE_ENTRY]);
  }, [fileMap]);

  const onClickNewResource = () => {
    dispatch(openNewResourceWizard());
  };

  return (
    <>
      <S.TitleBar>
        <MonoPaneTitle>
          Navigator <WarningsAndErrorsDisplay />
        </MonoPaneTitle>
        <S.TitleBarRightButtons>
          <S.PlusButton
            disabled={!isFolderOpen || isInClusterMode || isInPreviewMode}
            onClick={onClickNewResource}
            type="link"
            size="small"
            icon={<PlusOutlined />}
          />
          <Badge count={appliedFilters.length} size="small" offset={[-2, 2]} color={Colors.greenOkay}>
            <IconWithPopover
              popoverContent={<ResourceFilter />}
              popoverTrigger="click"
              iconComponent={<FilterOutlined style={appliedFilters.length ? {color: Colors.greenOkay} : {}} />}
              isDisabled={(!isFolderOpen && !isInClusterMode && !isInPreviewMode) || activeResources.length === 0}
            />
          </Badge>
          <ClusterCompareButton />
        </S.TitleBarRightButtons>
      </S.TitleBar>
      <S.List height={navigatorHeight}>
        <SectionRenderer<HelmValuesFile, HelmChartScopeType>
          sectionBlueprint={HelmChartSectionBlueprint}
          level={0}
          isLastSection={false}
        />
        <SectionRenderer<K8sResource, KustomizationScopeType>
          sectionBlueprint={KustomizationSectionBlueprint}
          level={0}
          isLastSection={false}
        />
        <SectionRenderer<K8sResource, K8sResourceScopeType>
          sectionBlueprint={K8sResourceSectionBlueprint}
          level={0}
          isLastSection={false}
        />
        <SectionRenderer<K8sResource, UnknownResourceScopeType>
          sectionBlueprint={UnknownResourceSectionBlueprint}
          level={0}
          isLastSection={false}
        />
      </S.List>
    </>
  );
};

export default NavPane;
