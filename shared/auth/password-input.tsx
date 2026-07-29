"use client";

type PasswordInputProps = {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  toggleLabel?: string;
  autoComplete?: string;
};

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  toggleLabel = "Toggle password visibility",
  autoComplete = "current-password",
}: PasswordInputProps) {
  return (
    <div className="auth-password-field relative w-full">
      <input
        type={show ? "text" : "password"}
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-control form-control-lg w-full !rounded-md !pe-10"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={toggleLabel}
        aria-pressed={show}
        className="auth-password-field__toggle absolute inset-y-0 end-0 flex items-center justify-center min-w-[2.75rem] px-3 text-[#8c9097] hover:text-defaulttextcolor dark:text-white/50 dark:hover:text-white/80 transition-colors"
      >
        <i className={`${show ? "ri-eye-line" : "ri-eye-off-line"} text-base leading-none`} />
      </button>
    </div>
  );
}
