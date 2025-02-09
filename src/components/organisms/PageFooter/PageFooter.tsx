import React, {useState, useEffect} from 'react';
import {ipcRenderer} from 'electron';
import {useAppSelector} from '@redux/hooks';
import styled from 'styled-components';

import Colors, {BackgroundColors} from '@styles/Colors';
import {AppBorders} from '@styles/Borders';
import Footer from '@components/atoms/Footer';
import {ROOT_FILE_ENTRY} from '@constants/constants';

const StyledFooter = styled(Footer)`
  width: 100%;
  height: 1.5em;
  padding-left: 10px;
  background: ${BackgroundColors.darkThemeBackground};
  border-top: ${AppBorders.pageDivider};
  color: ${Colors.grey7};
`;

const PageFooter = () => {
  const [appVersion, setAppVersion] = useState('');
  const [footerText, setFooterText] = useState('');
  const fileMap = useAppSelector(state => state.main.fileMap);
  const rootEntry = fileMap[ROOT_FILE_ENTRY];

  // not counting the root
  const nrOfFiles = Object.keys(fileMap).length - 1;

  ipcRenderer.send('app-version');
  ipcRenderer.once('app-version', (_, {version}) => {
    setAppVersion(version);
  });

  useEffect(() => {
    setFooterText(
      `Monokle ${appVersion} - kubeshop.io 2021${
        rootEntry && rootEntry.children ? ` - ${rootEntry.filePath} - ${nrOfFiles} files` : ''
      }`
    );
  }, [appVersion]);

  return <StyledFooter noborder="true">{footerText}</StyledFooter>;
};

export default PageFooter;
