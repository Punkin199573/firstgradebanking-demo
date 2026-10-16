import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Control, FieldPath } from "react-hook-form";
import { z } from "zod";
import { authFormSchema } from "@/lib/utils";
import { FormField, FormLabel, FormControl, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
const formSchema = authFormSchema("sign-up");
interface CustomInput {
  control: Control<z.infer<typeof formSchema>>;
  name: FieldPath<z.infer<typeof formSchema>>;
  label: string;
  placeholder: string;
  autoComplete?: string;
}

const CustomInput = ({
  control,
  name,
  label,
  placeholder,
  autoComplete,
}: CustomInput) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = name === "password";

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className="form-item">
          <FormLabel className="form-label">{label}</FormLabel>
          <div className="flex w-full flex-col">
            <FormControl>
              <div className="relative">
                <Input
                  placeholder={placeholder}
                  className={`input-class ${isPassword ? "pr-12" : ""}`}
                  type={isPassword && !passwordVisible ? "password" : "text"}
                  autoComplete={autoComplete}
                  {...field}
                />
                {isPassword && (
                  <button
                    type="button"
                    className="password-visibility-toggle"
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                  >
                    {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            </FormControl>
            <FormMessage className="form-message mt-2" />
          </div>
        </div>
      )}
    />
  );
};

export default CustomInput;
