/**
 * @starterkit/icons — web implementation
 *
 * Uses react-icons (Material Design set) which renders native SVG.
 * Metro automatically resolves index.native.tsx on iOS/Android instead of this file.
 *
 * Adding a new icon:
 *   1. Find the icon at https://react-icons.github.io/react-icons/icons/md/
 *   2. Import it here and re-export with a semantic name.
 *   3. Add the matching native wrapper in index.native.tsx using the
 *      equivalent MaterialIcons name from https://icons.expo.fyi
 */

// ─── Brand / Social ───────────────────────────────────────────────────────────
export { FaGoogle as GoogleIcon, FaMicrosoft as MicrosoftIcon } from 'react-icons/fa6';
// ─── Sidebar toggle (Lucide panel icons) ────────────────────────────────────
export {
  LuPanelLeftClose as SidebarCollapseIcon,
  LuPanelLeftOpen as SidebarExpandIcon,
} from 'react-icons/lu';
// ─── Navigation & Wayfinding ─────────────────────────────────────────────────
// ─── Sidebar sections ────────────────────────────────────────────────────────
// ─── CRUD & Actions ──────────────────────────────────────────────────────────
// ─── Users & Identity ────────────────────────────────────────────────────────
// ─── Games & Content ─────────────────────────────────────────────────────────
// ─── Analytics & Reports ─────────────────────────────────────────────────────
// ─── Files & Storage ─────────────────────────────────────────────────────────
// ─── Communication ───────────────────────────────────────────────────────────
// ─── Status & Feedback ───────────────────────────────────────────────────────
// ─── Time & Calendar ─────────────────────────────────────────────────────────
// ─── Misc ────────────────────────────────────────────────────────────────────
export {
  MdAccessTime as TimeIcon,
  MdAccountCircle as AvatarIcon,
  MdAdd as AddIcon,
  MdAdminPanelSettings as AdminIcon,
  MdAllInclusive as AllInclusiveIcon,
  MdAnalytics as AnalyticsIcon,
  MdArrowBack as ArrowBackIcon,
  MdArrowDownward as MoveDownIcon,
  MdArrowForward as ArrowForwardIcon,
  MdArrowUpward as MoveUpIcon,
  MdAssessment as ReportsIcon,
  MdAttachFile as AttachmentIcon,
  MdAttachMoney as BillingIcon,
  MdAutoAwesome as SparkleIcon,
  MdAutoAwesome as CreditsIcon,
  MdBadge as BadgeIcon,
  MdBarChart as BarChartIcon,
  MdBlock as BlockIcon,
  MdBook as NotebookIcon,
  MdBuild as BuildIcon,
  MdBusiness as ClubsIcon,
  MdCampaign as BullhornIcon,
  MdCancel as CancelIcon,
  MdChat as ChatIcon,
  MdCheck as CheckmarkIcon,
  MdCheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  MdCheckCircle as SuccessIcon,
  MdCheckCircleOutline as CheckIcon,
  MdChevronLeft as ChevronLeftIcon,
  MdChevronRight as ChevronRightIcon,
  MdClose as CloseIcon,
  MdCloseFullscreen as CloseFullscreenIcon,
  MdCloudDownload as CloudDownloadIcon,
  MdCloudUpload as CloudUploadIcon,
  MdContentCopy as CopyIcon,
  MdContentPaste as PasteIcon,
  MdDashboard as DashboardIcon,
  MdDateRange as DateRangeIcon,
  MdDelete as DeleteIcon,
  MdDescription as DocumentIcon,
  MdDragIndicator as DragIndicatorIcon,
  MdEdit as EditIcon,
  MdEmail as EmailIcon,
  MdEmojiEvents as TrophyIcon,
  MdError as ErrorIcon,
  MdExpandLess as ExpandLessIcon,
  MdExpandMore as ExpandMoreIcon,
  MdExtension as PuzzleIcon,
  MdFileDownload as DownloadIcon,
  MdFileUpload as UploadIcon,
  MdFilterList as FilterIcon,
  MdFolder as FolderIcon,
  MdFolderOpen as FolderOpenIcon,
  MdFormatListBulleted as ListIcon,
  MdForum as ForumIcon,
  MdGroups as ShareWithTeamsIcon,
  MdHelp as HelpIcon,
  MdHelpOutline as HelpOutlineIcon,
  MdHistory as HistoryIcon,
  MdHome as HomeIcon,
  MdImage as ImageIcon,
  MdInfo as InfoIcon,
  MdInsertDriveFile as FileIcon,
  MdInventory2 as BucketIcon,
  MdKey as KeyIcon,
  MdLabel as LabelIcon,
  MdLanguage as LanguageIcon,
  MdLeaderboard as LeaderboardIcon,
  MdLibraryBooks as LibraryIcon,
  MdLink as LinkIcon,
  MdLocationOn as LocationIcon,
  MdLock as LockIcon,
  MdLockOpen as UnlockIcon,
  MdLogout as LogoutIcon,
  MdMenu as MenuIcon,
  MdMenuBook as LearningIcon,
  MdMessage as SmsIcon,
  MdMoreHoriz as MoreHorizontalIcon,
  MdMoreVert as MoreVerticalIcon,
  MdNotifications as NotificationsIcon,
  MdNotificationsOff as NotificationsOffIcon,
  MdOpenInFull as OpenInFullIcon,
  MdOpenInNew as ExternalLinkIcon,
  MdPalette as PaletteIcon,
  MdPeople as UsersIcon,
  MdPerson as UserIcon,
  MdPersonAdd as AddUserIcon,
  MdPersonRemove as RemoveUserIcon,
  MdPhone as PhoneIcon,
  MdPictureAsPdf as PdfIcon,
  MdPieChart as PieChartIcon,
  MdPrint as PrintIcon,
  MdPublic as PublicIcon,
  MdQuiz as QuizIcon,
  MdRefresh as RefreshIcon,
  MdRemove as IndeterminateCheckboxIcon,
  MdSave as SaveIcon,
  MdSchedule as ClockIcon,
  MdSearch as SearchIcon,
  MdSecurity as SecurityIcon,
  MdSettings as SettingsIcon,
  MdShare as ShareIcon,
  MdSort as SortIcon,
  MdSportsEsports as GamesIcon,
  MdSportsVolleyball as VolleyballIcon,
  MdStar as StarIcon,
  MdStarBorder as StarOutlineIcon,
  MdSubject as ParagraphIcon,
  MdTextFields as TextIcon,
  MdToday as CalendarIcon,
  MdTrendingDown as TrendingDownIcon,
  MdTrendingUp as TrendingUpIcon,
  MdTune as TuneIcon,
  MdUnfoldMore as UnfoldMoreIcon,
  MdVerified as VerifiedIcon,
  MdVideocam as VideoIcon,
  MdVisibility as ViewIcon,
  MdVisibilityOff as HideIcon,
  MdWarning as WarningIcon,
} from 'react-icons/md';

export type { IconProps } from './types';
