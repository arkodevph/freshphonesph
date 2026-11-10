import type { ReactNode, SVGProps } from "react";

// Solar Linear by 480 Design, CC BY 4.0. SVG paths unchanged.
// Source: @solar-icons/js 2.3.1. See SolarIcons.LICENSE.md.
function solarIcon(name: string, paths: ReactNode) {
  return function SolarIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={24}
        height={24}
        fill="none"
        strokeWidth={1.5}
        aria-hidden="true"
        focusable="false"
        data-solar-icon={name}
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const ArrowDown = solarIcon(
  "arrow-down-linear",
  <>
    <path
      d={"M12 4L12 20M6 14L12 20L18 14"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const ArrowLeft = solarIcon(
  "arrow-left-linear",
  <>
    <path
      d={"M20 12H4M10 18L4 12L10 6"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const ArrowRight = solarIcon(
  "arrow-right-linear",
  <>
    <path
      d={"M4 12H20M14 18L20 12L14 6"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const ArrowUp = solarIcon(
  "arrow-up-linear",
  <>
    <path
      d={"M12 20L12 4M6 10L12 4L18 10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const ArrowRightUp = solarIcon(
  "arrow-right-up-linear",
  <>
    <path
      d={"M6 18L18 6M18 15V6H9"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const Bell = solarIcon(
  "bell-linear",
  <>
    <path
      d={
        "M18.7491 9.70957V9.00496C18.7491 5.13623 15.7274 2 12 2C8.27256 2 5.25087 5.13623 5.25087 9.00496V9.70957C5.25087 10.5552 5.00972 11.3818 4.5578 12.0854L3.45036 13.8095C2.43882 15.3843 3.21105 17.5249 4.97036 18.0229C9.57274 19.3257 14.4273 19.3257 19.0296 18.0229C20.789 17.5249 21.5612 15.3843 20.5496 13.8095L19.4422 12.0854C18.9903 11.3818 18.7491 10.5552 18.7491 9.70957Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M7.5 19C8.15503 20.7478 9.92246 22 12 22C14.0775 22 15.845 20.7478 16.5 19"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Calendar = solarIcon(
  "calendar-linear",
  <>
    <path
      d={
        "M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M7 4V2.5"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M17 4V2.5"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M2.5 9H21.5"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={"M17 13H17.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={"M12 13H12.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={"M7 13H7.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={"M17 17.0234H17.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={"M12 17.0234H12.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={"M7 17.0234H7.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const AltArrowDown = solarIcon(
  "alt-arrow-down-linear",
  <>
    <path
      d={"M19 9L12 15L5 9"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const AltArrowLeft = solarIcon(
  "alt-arrow-left-linear",
  <>
    <path
      d={"M15 5L9 12L15 19"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const AltArrowRight = solarIcon(
  "alt-arrow-right-linear",
  <>
    <path
      d={"M9 5L15 12L9 19"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const ChatRoundDots = solarIcon(
  "chat-round-dots-linear",
  <>
    <path
      d={
        "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M8 12H8.009M11.991 12H12M15.991 12H16"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const CheckCircle = solarIcon(
  "check-circle-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M8.5 12.5L10.5 14.5L15.5 9.5"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const ClockCircle = solarIcon(
  "clock-circle-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M12 8V12L14.5 14.5"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const Compass = solarIcon(
  "compass-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M13.024 14.5601C10.7142 15.484 9.5593 15.946 8.89964 15.4977C8.74324 15.3914 8.60834 15.2565 8.50206 15.1001C8.0538 14.4405 8.51575 13.2856 9.43967 10.9758C9.63673 10.4831 9.73527 10.2368 9.90474 10.0435C9.94792 9.99429 9.99429 9.94792 10.0435 9.90474C10.2368 9.73527 10.4831 9.63673 10.9758 9.43966C13.2856 8.51575 14.4405 8.0538 15.1001 8.50206C15.2565 8.60834 15.3914 8.74324 15.4977 8.89964C15.946 9.5593 15.484 10.7142 14.5601 13.024C14.363 13.5166 14.2645 13.763 14.095 13.9562C14.0518 14.0055 14.0055 14.0518 13.9562 14.095C13.763 14.2645 13.5166 14.363 13.024 14.5601Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Smartphone = solarIcon(
  "smartphone-linear",
  <>
    <path
      d={
        "M4 10C4 6.22876 4 4.34315 5.17157 3.17157C6.34315 2 8.22876 2 12 2C15.7712 2 17.6569 2 18.8284 3.17157C20 4.34315 20 6.22876 20 10V14C20 17.7712 20 19.6569 18.8284 20.8284C17.6569 22 15.7712 22 12 22C8.22876 22 6.34315 22 5.17157 20.8284C4 19.6569 4 17.7712 4 14V10Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M15 19H9"} stroke={"currentColor"} strokeLinecap={"round"} />
  </>,
);

export const DownloadMinimalistic = solarIcon(
  "download-minimalistic-linear",
  <>
    <path
      d={
        "M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={"M12 3V16M8 11.625L12 16L16 11.625"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const FileSend = solarIcon(
  "file-send-linear",
  <>
    <path
      d={"M8.5 18.5L8.5 13.5M10.5 15.375L8.5 13.5L6.5 15.375"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={
        "M13 2.2627V5.0003C13 7.35732 13 8.53583 13.7322 9.26806C14.4645 10.0003 15.643 10.0003 18 10.0003H21.58"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M3.17139 3.17157C4.34296 2 6.23851 2 10.0296 2C11.5546 2 12.3173 2.00011 13.0093 2.26562C13.7012 2.53114 14.2651 3.03857 15.3929 4.05365L19.3516 7.61621C20.6558 8.78998 21.3078 9.3774 21.6538 10.1543C21.9998 10.9312 22 11.8079 22 13.5625V14C22 17.7712 22 19.6566 20.8284 20.8281C19.6569 21.9997 17.7712 22 14 22L9.9969 21.9997C6.22761 21.9997 4.34284 21.9997 3.17157 20.8284C2 19.6569 2 17.7712 2 14V9.9982C2 6.22817 2 4.34296 3.17139 3.17157Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const FileText = solarIcon(
  "file-text-linear",
  <>
    <path d={"M6 14.5H14"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M6 18H11.5"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={
        "M13 2.2627V5.0003C13 7.35732 13 8.53583 13.7322 9.26806C14.4645 10.0003 15.643 10.0003 18 10.0003H21.58"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M3.17139 3.17157C4.34296 2 6.23851 2 10.0296 2C11.5546 2 12.3173 2.00011 13.0093 2.26562C13.7012 2.53114 14.2651 3.03857 15.3929 4.05365L19.3516 7.61621C20.6558 8.78998 21.3078 9.3774 21.6538 10.1543C21.9998 10.9312 22 11.8079 22 13.5625V14C22 17.7712 22 19.6566 20.8284 20.8281C19.6569 21.9997 17.7712 22 14 22L9.9969 21.9997C6.22761 21.9997 4.34284 21.9997 3.17157 20.8284C2 19.6569 2 17.7712 2 14V9.9982C2 6.22817 2 4.34296 3.17139 3.17157Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const Settings = solarIcon(
  "settings-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"3"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const HomeAngle = solarIcon(
  "home-angle-linear",
  <>
    <path
      d={
        "M2.36407 12.9579C1.98463 10.3208 1.79491 9.00229 2.33537 7.87495C2.87583 6.7476 4.02619 6.06234 6.32691 4.69181L7.71175 3.86687C9.80104 2.62229 10.8457 2 12 2C13.1543 2 14.199 2.62229 16.2882 3.86687L17.6731 4.69181C19.9738 6.06234 21.1242 6.7476 21.6646 7.87495C22.2051 9.00229 22.0154 10.3208 21.6359 12.9579L21.3572 14.8952C20.8697 18.2827 20.626 19.9764 19.451 20.9882C18.2759 22 16.5526 22 13.1061 22H10.8939C7.44737 22 5.72409 22 4.54903 20.9882C3.37396 19.9764 3.13025 18.2827 2.64284 14.8952L2.36407 12.9579Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M15 18H9"} stroke={"currentColor"} strokeLinecap={"round"} />
  </>,
);

export const InfoCircle = solarIcon(
  "info-circle-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M12 17V11"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={"M12 8H12.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const HamburgerMenu = solarIcon(
  "hamburger-menu-linear",
  <>
    <path d={"M20 7L4 7"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M20 12L4 12"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M20 17L4 17"} stroke={"currentColor"} strokeLinecap={"round"} />
  </>,
);

export const LockKeyhole = solarIcon(
  "lock-keyhole-linear",
  <>
    <path
      d={
        "M2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.75736 10 5.17157 10 8 10H16C18.8284 10 20.2426 10 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <circle
      cx={"12"}
      cy={"16"}
      r={"2"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Magnifier = solarIcon(
  "magnifier-linear",
  <>
    <circle
      cx={"11.5"}
      cy={"11.5"}
      r={"9.5"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M18.2173 18.2178L21.9999 22.0004"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Moon = solarIcon(
  "moon-linear",
  <>
    <path
      d={
        "M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const Box = solarIcon(
  "box-linear",
  <>
    <path
      d={
        "M15.5777 3.38197L17.5777 4.43152C19.7294 5.56066 20.8052 6.12523 21.4026 7.13974C22 8.15425 22 9.41667 22 11.9415V12.0585C22 14.5833 22 15.8458 21.4026 16.8603C20.8052 17.8748 19.7294 18.4393 17.5777 19.5685L15.5777 20.618C13.8221 21.5393 12.9443 22 12 22C11.0557 22 10.1779 21.5393 8.42229 20.618L6.42229 19.5685C4.27063 18.4393 3.19479 17.8748 2.5974 16.8603C2 15.8458 2 14.5833 2 12.0585V11.9415C2 9.41667 2 8.15425 2.5974 7.13974C3.19479 6.12523 4.27063 5.56066 6.42229 4.43152L8.42229 3.38197C10.1779 2.46066 11.0557 2 12 2C12.9443 2 13.8221 2.46066 15.5777 3.38197Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M21 7.5L17 9.5M12 12L3 7.5M12 12V21.5M12 12C12 12 14.7426 10.6287 16.5 9.75C16.6953 9.65237 17 9.5 17 9.5M17 9.5V13M17 9.5L7.5 4.5"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Add = solarIcon(
  "add-linear",
  <>
    <path d={"M4 12L20 12"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={"M12.0204 4L12.0205 20.0003"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Printer = solarIcon(
  "printer-linear",
  <>
    <path d={"M9 10H6"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M19 14L5 14"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={
        "M17.9827 6C17.9359 4.44655 17.7626 3.51998 17.1213 2.87868C16.2426 2 14.8284 2 12 2C9.17157 2 7.75736 2 6.87868 2.87868C6.23738 3.51998 6.06413 4.44655 6.01732 6M18 14V16C18 18.8284 18 20.2426 17.1213 21.1213C16.2426 22 14.8284 22 12 22C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V14"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M15 16.5H9"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M13 19H9"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={"M17 10H17.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={
        "M17.9832 17.9827C17.9888 17.9827 17.9944 17.9827 18 17.9827C19.5535 17.9359 20.48 17.7626 21.1213 17.1213C22 16.2426 22 14.8284 22 12C22 9.17157 22 7.75736 21.1213 6.87868C20.2426 6 18.8284 6 16 6H8C5.17157 6 3.75736 6 2.87868 6.87868C2 7.75736 2 9.17157 2 12C2 14.8284 2 16.2426 2.87868 17.1213C3.51998 17.7626 4.44655 17.9359 6 17.9827H6.01681"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Logout = solarIcon(
  "logout-linear",
  <>
    <path
      d={"M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M10 12H20M17 15L20 12L17 9"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const Widget = solarIcon(
  "widget-linear",
  <>
    <path
      d={
        "M2.5 6.5C2.5 4.61438 2.5 3.67157 3.08579 3.08579C3.67157 2.5 4.61438 2.5 6.5 2.5C8.38562 2.5 9.32843 2.5 9.91421 3.08579C10.5 3.67157 10.5 4.61438 10.5 6.5C10.5 8.38562 10.5 9.32843 9.91421 9.91421C9.32843 10.5 8.38562 10.5 6.5 10.5C4.61438 10.5 3.67157 10.5 3.08579 9.91421C2.5 9.32843 2.5 8.38562 2.5 6.5Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M13.5 17.5C13.5 15.6144 13.5 14.6716 14.0858 14.0858C14.6716 13.5 15.6144 13.5 17.5 13.5C19.3856 13.5 20.3284 13.5 20.9142 14.0858C21.5 14.6716 21.5 15.6144 21.5 17.5C21.5 19.3856 21.5 20.3284 20.9142 20.9142C20.3284 21.5 19.3856 21.5 17.5 21.5C15.6144 21.5 14.6716 21.5 14.0858 20.9142C13.5 20.3284 13.5 19.3856 13.5 17.5Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M2.5 17.5C2.5 15.6144 2.5 14.6716 3.08579 14.0858C3.67157 13.5 4.61438 13.5 6.5 13.5C8.38562 13.5 9.32843 13.5 9.91421 14.0858C10.5 14.6716 10.5 15.6144 10.5 17.5C10.5 19.3856 10.5 20.3284 9.91421 20.9142C9.32843 21.5 8.38562 21.5 6.5 21.5C4.61438 21.5 3.67157 21.5 3.08579 20.9142C2.5 20.3284 2.5 19.3856 2.5 17.5Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M13.5 6.5C13.5 4.61438 13.5 3.67157 14.0858 3.08579C14.6716 2.5 15.6144 2.5 17.5 2.5C19.3856 2.5 20.3284 2.5 20.9142 3.08579C21.5 3.67157 21.5 4.61438 21.5 6.5C21.5 8.38562 21.5 9.32843 20.9142 9.91421C20.3284 10.5 19.3856 10.5 17.5 10.5C15.6144 10.5 14.6716 10.5 14.0858 9.91421C13.5 9.32843 13.5 8.38562 13.5 6.5Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Sun = solarIcon(
  "sun-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"6"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M12 2V3"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M12 21V22"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M22 12L21 12"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path d={"M3 12L2 12"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={"M19.0708 4.92969L18.678 5.32252"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M5.32178 18.6777L4.92894 19.0706"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M19.0708 19.0703L18.678 18.6775"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M5.32178 5.32227L4.92894 4.92943"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Delivery = solarIcon(
  "delivery-linear",
  <>
    <path
      d={
        "M9.56541 8.73049C9.0804 6.97492 8.8379 6.09714 9.24954 5.40562C9.66119 4.71409 10.5662 4.47889 12.3763 4.00849L14.2962 3.50955C16.1062 3.03915 17.0113 2.80394 17.7242 3.20319C18.4372 3.60244 18.6797 4.48023 19.1647 6.2358L19.6792 8.09786C20.1642 9.85343 20.4067 10.7312 19.995 11.4227C19.5834 12.1143 18.6784 12.3495 16.8683 12.8199L14.9484 13.3188C13.1384 13.7892 12.2333 14.0244 11.5203 13.6252C10.8073 13.2259 10.5648 12.3481 10.0798 10.5926L9.56541 8.73049Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M8.23 15.0602L6.08 7.27014C5.89453 6.61732 5.38563 6.12036 4.7 5.92L3 5.4502"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <circle
      cx={"8.0499"}
      cy={"18.1002"}
      r={"2.9"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M10.9199 17.36L19.9999 15"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const UserCircle = solarIcon(
  "user-circle-linear",
  <>
    <circle
      cx={"12"}
      cy={"9"}
      r={"3"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <circle
      cx={"12"}
      cy={"12"}
      r={"10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M17.9691 20C17.81 17.1085 16.9247 15 11.9999 15C7.07521 15 6.18991 17.1085 6.03076 20"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
  </>,
);

export const Wallet = solarIcon(
  "wallet-linear",
  <>
    <path
      d={"M6 8H10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
    <path
      d={
        "M20.8333 9H18.2308C16.4465 9 15 10.3431 15 12C15 13.6569 16.4465 15 18.2308 15H20.8333C20.9167 15 20.9583 15 20.9935 14.9979C21.5328 14.965 21.9623 14.5662 21.9977 14.0654C22 14.0327 22 13.994 22 13.9167V10.0833C22 10.006 22 9.96726 21.9977 9.9346C21.9623 9.43384 21.5328 9.03496 20.9935 9.00214C20.9583 9 20.9167 9 20.8333 9Z"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={
        "M20.965 9C20.8873 7.1277 20.6366 5.97975 19.8284 5.17157C18.6569 4 16.7712 4 13 4L10 4C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13C16.7712 20 18.6569 20 19.8284 18.8284C20.6366 18.0203 20.8873 16.8723 20.965 15"
      }
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path
      d={"M17.9912 12H18.0002"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const DangerCircle = solarIcon(
  "danger-circle-linear",
  <>
    <circle
      cx={"12"}
      cy={"12"}
      r={"10"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M12 7V13"} stroke={"currentColor"} strokeLinecap={"round"} />
    <path
      d={"M12 16H12.0001"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
    />
  </>,
);

export const Close = solarIcon(
  "close-linear",
  <>
    <path
      d={"M19.0068 5L5.00684 19"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
    />
    <path d={"M19 19L5 5"} stroke={"currentColor"} strokeLinecap={"round"} />
  </>,
);
