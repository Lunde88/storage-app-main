// "use client";
// import { useState, useRef, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { FormInput } from "../base/form/FormInput";
// import { sanitiseRegNumber } from "@/lib/vesUtils";
// import { FormField } from "../forms/FormField";

// // Debounce helper (no external deps)
// function debounce<F extends (arg: string) => void>(func: F, wait: number) {
//   let timeout: ReturnType<typeof setTimeout>;
//   return (arg: string) => {
//     clearTimeout(timeout);
//     timeout = setTimeout(() => func(arg), wait);
//   };
// }

// // Type for DVLA API result (expand as needed)
// type DVLAResult = {
//   make?: string;
//   model?: string;
//   colour?: string;
//   yearOfManufacture?: number;
//   // Other known fields...
// } & Record<string, unknown>;

// export function VehicleRegLookupFields(props: {
//   make: string;
//   setMake: (v: string) => void;
//   model: string;
//   setModel: (v: string) => void;
//   colour: string;
//   setColour: (v: string) => void;
//   year: string;
//   setYear: (v: string) => void;
//   disabled?: boolean;
// }) {
//   const [identifier, setIdentifier] = useState("");
//   const [lookupLoading, setLookupLoading] = useState(false);
//   const [lookupError, setLookupError] = useState<string | null>(null);

//   // Debounce setup
//   const debouncedLookupRef = useRef<ReturnType<typeof debounce> | null>(null);

//   // Set up the debounced lookup function just once
//   useEffect(() => {
//     debouncedLookupRef.current = debounce((cleanReg: string) => {
//       void lookupRegistration(cleanReg);
//     }, 600);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // The actual lookup function
//   async function lookupRegistration(cleanReg: string) {
//     setLookupError(null);
//     if (!cleanReg || cleanReg.length < 1 || cleanReg.length > 8) {
//       setLookupError(
//         "Enter a valid registration (1-8 letters/numbers, no spaces).",
//       );
//       setLookupLoading(false);
//       return;
//     }
//     setLookupLoading(true);
//     try {
//       const res = await fetch("/api/lookup-vehicle", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ registrationNumber: cleanReg }),
//       });

//       const data: DVLAResult = await res.json();
//       if (!res.ok) {
//         setLookupError(
//           typeof data.error === "string" ? data.error : "Vehicle not found.",
//         );
//       } else {
//         props.setMake(data.make || "");
//         props.setModel(data.model || "");
//         props.setColour(data.colour || "");
//         props.setYear(
//           data.yearOfManufacture ? String(data.yearOfManufacture) : "",
//         );
//         setLookupError(null);
//       }
//     } catch (e) {
//       console.error("Error looking up registration:", e);
//       setLookupError("Error looking up registration.");
//     }
//     setLookupLoading(false);
//   }

//   // Handler for manual lookup
//   function handleManualLookup() {
//     const cleanReg = sanitiseRegNumber(identifier);
//     if (cleanReg.length >= 6 && cleanReg.length <= 8) {
//       lookupRegistration(cleanReg);
//     } else {
//       setLookupError("Please enter a full registration (6-8 characters).");
//     }
//   }

//   // Handler for debounced lookup on blur or change
//   function handleDebouncedLookup(val: string) {
//     const cleanReg = sanitiseRegNumber(val);
//     // Only lookup if 6, 7 or 8 characters
//     if (cleanReg.length >= 6 && cleanReg.length <= 8) {
//       if (debouncedLookupRef.current) {
//         debouncedLookupRef.current(cleanReg);
//       }
//     }
//   }

//   return (
//     <>
//       <FormField
//         label="Registration number / identifier"
//         htmlFor="identifier"
//         required
//       >
//         <div className="flex items-center gap-2">
//           <FormInput
//             id="identifier"
//             name="identifier"
//             placeholder="ABC 123D"
//             value={identifier}
//             onChange={(e) => {
//               setIdentifier(e.target.value);
//               props.setMake("");
//               props.setModel("");
//               props.setColour("");
//               props.setYear("");
//               handleDebouncedLookup(e.target.value);
//             }}
//             onBlur={(e) => handleDebouncedLookup(e.target.value)}
//             autoComplete="off"
//             disabled={props.disabled}
//             className="flex-1 uppercase"
//           />
//           <Button
//             type="button"
//             size="sm"
//             variant="secondary"
//             disabled={
//               lookupLoading ||
//               !identifier ||
//               props.disabled ||
//               sanitiseRegNumber(identifier).length < 6 ||
//               sanitiseRegNumber(identifier).length > 8
//             }
//             onClick={handleManualLookup}
//             tabIndex={-1}
//           >
//             {lookupLoading ? "Looking up…" : "Lookup"}
//           </Button>
//         </div>
//       </FormField>

//       {lookupError && (
//         <div className="mt-1 text-sm text-red-600">{lookupError}</div>
//       )}
//     </>
//   );
// }

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "../base/form/FormInput";
import { sanitiseRegNumber } from "@/lib/vesUtils";
import { FormField } from "../forms/FormField";

type DVLAResult = {
  make?: string;
  model?: string;
  colour?: string;
  yearOfManufacture?: number;
} & Record<string, unknown>;

export function VehicleRegLookupFields(props: {
  identifier: string;
  setIdentifier: (v: string) => void;
  make: string;
  setMake: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  colour: string;
  setColour: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  disabled?: boolean;
}) {
  //   const [identifier, setIdentifier] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupSuccess, setLookupSuccess] = useState(false);

  // The actual lookup function
  async function lookupRegistration(cleanReg: string) {
    setLookupError(null);
    if (!cleanReg || cleanReg.length < 6 || cleanReg.length > 8) {
      setLookupError("Please enter a full registration (6-8 characters).");
      setLookupLoading(false);
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch("/api/lookup-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: cleanReg }),
      });

      const data: DVLAResult = await res.json();
      if (!res.ok) {
        setLookupError(
          typeof data.error === "string" ? data.error : "Vehicle not found.",
        );
      } else {
        props.setMake(data.make || "");
        props.setModel(data.model || "");
        props.setColour(data.colour || "");
        props.setYear(
          data.yearOfManufacture ? String(data.yearOfManufacture) : "",
        );
        setLookupError(null);
        setLookupSuccess(true);
      }
    } catch (e) {
      console.error("Error looking up registration:", e);
      setLookupError("Error looking up registration.");
    }
    setLookupLoading(false);
  }

  // Handler for manual lookup
  function handleManualLookup() {
    const cleanReg = sanitiseRegNumber(props.identifier);
    lookupRegistration(cleanReg);
  }

  return (
    <>
      <FormField
        label="Registration number / identifier"
        htmlFor="identifier"
        required
      >
        <div className="flex items-center gap-2">
          <FormInput
            id="identifier"
            name="identifier"
            placeholder="ABC 123D"
            // value={identifier}
            value={props.identifier}
            onChange={(e) => {
              props.setIdentifier(e.target.value);
              props.setMake("");
              props.setModel("");
              props.setColour("");
              props.setYear("");
              setLookupError(null); // Clear error on change
              setLookupSuccess(false);
            }}
            autoComplete="off"
            disabled={props.disabled}
            className="flex-1 uppercase"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={
              lookupLoading ||
              !props.identifier ||
              props.disabled ||
              sanitiseRegNumber(props.identifier).length < 6 ||
              sanitiseRegNumber(props.identifier).length > 8
            }
            onClick={handleManualLookup}
            tabIndex={-1}
          >
            {lookupLoading ? "Looking up…" : "Lookup"}
          </Button>
        </div>
      </FormField>

      {lookupError && (
        <div className="mt-1 text-sm text-red-600">{lookupError}</div>
      )}
      {lookupSuccess && !lookupError && (
        <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
          <span>✅</span>
          <span>
            Vehicle found{props.make && `: ${props.make}`}
            {props.year && ` (${props.year})`}
            {props.colour && ` ${props.colour}`}
          </span>
        </div>
      )}
    </>
  );
}
