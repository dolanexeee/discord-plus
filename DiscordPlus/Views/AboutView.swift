import SwiftUI

struct AboutView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 14) {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                        .font(.largeTitle)
                        .foregroundColor(Color(hex: "#5865F2"))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Discord Plus").font(.title2).bold()
                        Text("ديسكورد بلس — عميل ديسكورد معدّل مبني على نسخة الويب")
                            .font(.subheadline).foregroundColor(.secondary)
                    }
                }

                GroupBox {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("تحذير: الحساب والخطر").font(.headline)
                        Text("العملاء المعدّلة مخالفة لشروط استخدام Discord وقد تؤدي إلى حظر الحساب. جرّب التطبيق بحساب ثانوي أولًا، ولا تستخدم حسابك الأساسي حتى تتأكد.")
                            .font(.subheadline)
                    }
                }

                GroupBox {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("الخصوصية").font(.headline)
                        Text("تسجيل الدخول يتم داخل متصفح التطبيق فقط. التطبيق لا يخزّن ولا يسجّل ولا يرسل كلمات المرور أو رموز الجلسة. الجلسة تبقى في متصفح النظام (WebKit) على جهازك.")
                            .font(.subheadline)
                    }
                }

                GroupBox {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("كيف يعمل").font(.headline)
                        Text("التطبيق يعرض عميل ديسكورد الرسمي للويب (دائمًا آخر إصدار) ويضيف عليه ثيمات وبلجنات وكود CSS مخصص عبر حقن جافاسكربت محلي. الكود كله مفتوح المصدر ومكتوب خصيصًا لـ Discord Plus، بنمط مشابه لنمط بلجنات Vencord وKettu.")
                            .font(.subheadline)
                    }
                }

                GroupBox {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("معلومات").font(.headline)
                        Text("الإصدار 1.0.0 • البناء 1\nمعرّف الحزمة: com.mustafa.discordplus")
                            .font(.caption).foregroundColor(.secondary)
                    }
                }

                Spacer()
            }
            .padding()
        }
        .environment(\.layoutDirection, .rightToLeft)
        .navigationTitle("حول التطبيق")
        .navigationBarTitleDisplayMode(.inline)
    }
}
