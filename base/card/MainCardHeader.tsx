// import { CardHeader, CardTitle } from "../../ui/card";
// import React from "react";

// type MainCardHeaderProps = {
//   title: string;
//   icon?: React.ReactNode;
//   children?: React.ReactNode;
//   className?: string;
// };

// export default function MainCardHeader({
//   title,
//   icon,
//   children,
//   className,
// }: MainCardHeaderProps) {
//   return (
//     <CardHeader className={className ?? "px-3"}>
//       <div className="flex w-full items-center justify-between">
//         <div className="flex items-center gap-2">
//           {icon && icon}
//           <CardTitle className="text-lg">{title}</CardTitle>
//         </div>
//         {children}
//       </div>
//     </CardHeader>
//   );
// }

import { CardHeader, CardTitle } from "../../ui/card";
import React from "react";

type MainCardHeaderProps = {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

// Notice the React.forwardRef here:
const MainCardHeader = React.forwardRef<
  HTMLHeadingElement,
  MainCardHeaderProps
>(({ title, icon, children, className }, ref) => (
  <CardHeader className={className ?? "gap-0 px-3"}>
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && icon}
        {/* Forward the ref to CardTitle */}
        <CardTitle
          ref={ref}
          className="font-heading scroll-mt-[92px] text-xl md:scroll-mt-[104px]"
        >
          {title}
        </CardTitle>
      </div>
      {children}
    </div>
  </CardHeader>
));

MainCardHeader.displayName = "MainCardHeader"; // Needed for forwardRef components

export default MainCardHeader;
