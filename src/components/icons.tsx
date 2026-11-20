import type { SVGProps } from "react";

const base = (d: React.ReactNode) =>
  function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {d}
      </svg>
    );
  };

export const IconHome = base(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></>);
export const IconCompare = base(<><path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5" /><path d="M17 20V4m0 16-3.5-3.5M17 20l3.5-3.5" /></>);
export const IconScan = base(<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>);
export const IconPin = base(<><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.500C5 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const IconUser = base(<><circle cx="12" cy="8" r="4" /><path d="M4.500 20.500c1.200-3.600 4-5.500 7.500-5.500s6.300 1.900 7.500 5.500" /></>);
export const IconBell = base(<><path d="M6 9.500a6 6 0 0 1 12 0c0 5 2 6.500 2 6.500H4s2-1.500 2-6.500Z" /><path d="M10 19.500a2.200 2.200 0 0 0 4 0" /></>);
export const IconChat = base(<><path d="M4 5.500h16v11H9.500L5 20v-3.500H4Z" /></>);
export const IconRepeat = base(<><path d="M4 9.500A6 6 0 0 1 10 4h8m0 0-3-3m3 3-3 3" /><path d="M20 14.500a6 6 0 0 1-6 5.500H6m0 0 3 3m-3-3 3-3" /></>);
export const IconPiggy = base(<><path d="M4 12.500C4 9 7.500 6.500 12 6.500c1.200 0 2.300.2 3.300.5L18 5.500v3c1.300 1 2 2.400 2 4 0 1.700-.9 3.200-2.300 4.200V19.500h-3v-1.700c-.9.200-1.800.2-2.700.2s-1.800 0-2.700-.2v1.700h-3v-2.800C4.900 15.700 4 14.200 4 12.500Z" /><path d="M9.500 10h3" /></>);
export const IconGift = base(<><rect x="4" y="10" width="16" height="10" rx="1.500" /><path d="M3 7h18v3H3zM12 7v13M12 7s-1-4-3.500-4S6 6 8 7m4 0s1-4 3.500-4S18 6 16 7" /></>);
export const IconStar = base(<path d="m12 3.500 2.600 5.400 5.900.800-4.300 4.100 1 5.800L12 16.900 6.800 19.600l1-5.800L3.500 9.700l5.900-.8Z" />);
export const IconCheck = base(<path d="m5 12.500 4.500 4.500L19 7.500" />);
export const IconX = base(<path d="M6 6l12 12M18 6 6 18" />);
export const IconArrow = base(<path d="M5 12h14m0 0-5.500-5.500M19 12l-5.500 5.500" />);
export const IconChevron = base(<path d="m9 5.500 6.500 6.500L9 18.500" />);
export const IconPlus = base(<path d="M12 5v14M5 12h14" />);
export const IconShield = base(<><path d="M12 3.500 5 6v5.500c0 4.300 2.900 7.300 7 9 4.100-1.700 7-4.700 7-9V6Z" /><path d="m9 12 2.200 2.200L15.200 10" /></>);
export const IconSettings = base(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800" /></>);
export const IconHelp = base(<><circle cx="12" cy="12" r="9" /><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 .900-1 1.700M12 17h.01" /></>);
export const IconHeart = base(<path d="M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10Z" />);
export const IconShare = base(<><path d="M12 15V4m0 0L8 8m4-4 4 4" /><path d="M5 12.500V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.500" /></>);
export const IconBolt = base(<path d="M13.500 3 5 13.500h6L10.500 21 19 10.500h-6Z" />);
export const IconWifi = base(<><path d="M3 9.500a13 13 0 0 1 18 0M6 13a8.500 8.500 0 0 1 12 0M9 16.500a4.200 4.200 0 0 1 6 0" /><path d="M12 20h.01" /></>);
export const IconPhone = base(<><rect x="7" y="2.500" width="10" height="19" rx="2.500" /><path d="M11 18.500h2" /></>);
export const IconDoc = base(<><path d="M6.500 3h8L19 7.500V20a1 1 0 0 1-1 1H6.500a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 13h6M9 16.500h6" /></>);
export const IconLock = base(<><rect x="5" y="10.500" width="14" height="10" rx="2" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" /></>);
export const IconTrash = base(<><path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l1 13h9l1-13" /></>);
export const IconExternal = base(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>);
export const IconClock = base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5.500l3.500 2" /></>);
export const IconMenu = base(<path d="M4 7h16M4 12h16M4 17h16" />);
