export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-sand-200 p-8 text-center">
        <h1 className="text-xl font-bold text-khartoum-900 mb-2">استعادة كلمة المرور</h1>
        <p className="text-khartoum-500 text-sm mb-4">
          ميزة استعادة كلمة المرور عبر البريد الإلكتروني قيد الإعداد حالياً.
        </p>
        <p className="text-khartoum-500 text-sm mb-2">
          إذا نسيت كلمة المرور، يمكنك الدخول باستخدام تسجيل الدخول عبر Google (إن كان حسابك مرتبطاً به)،
          أو إنشاء حساب جديد بنفس البريد الإلكتروني.
        </p>
        <p className="text-xs text-khartoum-400 mt-4">
          عند تفعيل استعادة كلمة المرور، ستتمكن من طلب رابط إعادة التعيين مباشرة من هنا.
        </p>
      </div>
    </div>
  )
}



