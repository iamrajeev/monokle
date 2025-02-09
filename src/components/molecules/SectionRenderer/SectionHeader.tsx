import {useState} from 'react';

import {SectionCustomComponent, SectionInstance} from '@models/navigator';

import {MinusSquareOutlined, PlusSquareOutlined} from '@ant-design/icons';

import Colors from '@styles/Colors';

import * as S from './styled';

interface SectionHeaderProps {
  name: string;
  sectionInstance: SectionInstance;
  isSectionSelected: boolean;
  isCollapsed: boolean;
  isSectionHighlighted: boolean;
  isLastSection: boolean;
  hasChildSections: boolean;
  isSectionInitialized: boolean;
  isSectionVisible: boolean;
  isCollapsedMode: 'collapsed' | 'expanded' | 'mixed';
  level: number;
  itemsLength: number;
  expandSection: () => void;
  collapseSection: () => void;
  CustomNameDisplay?: SectionCustomComponent;
  CustomNameSuffix?: SectionCustomComponent;
  disableHoverStyle: boolean;
}

function SectionHeader(props: SectionHeaderProps) {
  const {
    name,
    sectionInstance,
    isSectionSelected,
    isCollapsed,
    isSectionHighlighted,
    isLastSection,
    hasChildSections,
    isSectionInitialized,
    isSectionVisible,
    isCollapsedMode,
    level,
    itemsLength,
    expandSection,
    collapseSection,
    CustomNameDisplay,
    CustomNameSuffix,
    disableHoverStyle,
  } = props;
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <S.NameContainer
      isHovered={isHovered}
      isSelected={isSectionSelected && isCollapsed}
      isHighlighted={isSectionHighlighted && isCollapsed}
      isLastSection={isLastSection}
      hasChildSections={hasChildSections}
      isCollapsed={isCollapsed}
      isInitialized={isSectionInitialized}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      isVisible={isSectionVisible}
      disableHoverStyle={disableHoverStyle}
    >
      {CustomNameDisplay ? (
        <CustomNameDisplay sectionInstance={sectionInstance} />
      ) : (
        <>
          <S.Name
            isSelected={isSectionSelected && isCollapsed}
            isHighlighted={isSectionSelected && isCollapsed}
            level={level}
          >
            {name}
            {itemsLength > 0 && (
              <S.ItemsLength selected={isSectionSelected && isCollapsed}>{itemsLength}</S.ItemsLength>
            )}
            {CustomNameSuffix && <CustomNameSuffix sectionInstance={sectionInstance} />}
          </S.Name>
          {isHovered && isSectionInitialized && (
            <S.Collapsible>
              {(isCollapsedMode === 'collapsed' || isCollapsedMode === 'mixed') && (
                <PlusSquareOutlined
                  style={{color: isSectionSelected ? Colors.blackPure : undefined}}
                  onClick={expandSection}
                />
              )}
              {(isCollapsedMode === 'expanded' || isCollapsedMode === 'mixed') && (
                <MinusSquareOutlined onClick={collapseSection} style={{marginLeft: '5px'}} />
              )}
            </S.Collapsible>
          )}
        </>
      )}
    </S.NameContainer>
  );
}

export default SectionHeader;
