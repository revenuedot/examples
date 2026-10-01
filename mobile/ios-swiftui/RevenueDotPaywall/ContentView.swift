// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: a stand-in for your app's own screen: it shows whether Pro is active, opens the paywall, and has the
// account actions every subscription app needs (restore, manage, log in).
// Docs: https://revenuedot.app/docs/sdks/ios
import RevenueCat
import SwiftUI

struct ContentView: View {
    @StateObject private var model = PaywallModel()
    @State private var paywall = ["paywall", "plans"].contains(UserDefaults.standard.string(forKey: "RDScreen") ?? "")
    @State private var userID = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                HStack(spacing: 10) {
                    BrandMark(size: 28)
                    Text("Your app").font(.system(size: 17, weight: .semibold))
                    Spacer()
                    if model.isPro {
                        HStack(spacing: 6) { Circle().fill(Theme.accent).frame(width: 7, height: 7); Text("Pro").font(.system(size: 13, weight: .semibold)) }
                            .padding(.horizontal, 10).frame(height: 30).overlay(Capsule().strokeBorder(Theme.hairline))
                    }
                }
                VStack(alignment: .leading, spacing: 14) {
                    Text(model.isPro ? "Pro is active." : "You're on the free plan.").font(Theme.display(32)).tracking(-0.7)
                    Text(model.isPro
                         ? (model.proExpiry.map { "Access until \($0.formatted(date: .abbreviated, time: .omitted))." } ?? "Access for life.")
                         : "This screen stands in for your app. The paywall is one SwiftUI view you can drop into yours.")
                        .font(.system(size: 17)).foregroundStyle(Theme.ink2)
                    if !model.isPro { PrimaryButton(title: "See plans") { paywall = true }.padding(.top, 8) }
                }
                VStack(spacing: 0) {
                    row("arrow.clockwise", "Restore purchases") { Task { await model.restore() } }
                    Divider().padding(.leading, 52)
                    row("creditcard", "Manage subscription") { Task { try? await Purchases.shared.showManageSubscriptions() } }
                }
                .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.hairline))
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: "Developer")
                    VStack(spacing: 0) {
                        HStack {
                            Text("App user id").font(.system(size: 14)).foregroundStyle(Theme.ink2)
                            Spacer(minLength: 12)
                            Text(model.appUserID).font(Theme.mono).lineLimit(1).truncationMode(.middle).textSelection(.enabled)
                        }
                        .padding(.horizontal, 16).frame(minHeight: 48)
                        Divider()
                        HStack(spacing: 10) {
                            TextField("Your user id", text: $userID).font(Theme.mono).textInputAutocapitalization(.never).autocorrectionDisabled()
                            Button("Log in") { Task { await model.logIn(userID) } }
                                .font(.system(size: 15, weight: .semibold)).tint(Theme.ink).disabled(model.busy || userID.isEmpty)
                        }
                        .padding(.horizontal, 16).frame(minHeight: 52)
                    }
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.hairline))
                    ForEach([model.message, model.loadError ?? ""].filter { !$0.isEmpty }, id: \.self) {
                        Text($0).font(.system(size: 13)).foregroundStyle(Theme.ink2)
                    }
                }
            }
            .padding(.horizontal, Theme.gutter).padding(.vertical, 12)
        }
        .background(Theme.ground)
        .fullScreenCover(isPresented: $paywall) { PaywallView(model: model) { paywall = false } }
        .task { await model.load() }
        .task { await model.listen() }
    }

    private func row(_ icon: String, _ title: String, action: @escaping () -> Void) -> some View {
        Button { Haptic.tap(); action() } label: {
            HStack(spacing: 14) {
                Image(systemName: icon).font(.system(size: 16, weight: .medium)).frame(width: 22)
                Text(title).font(.system(size: 17))
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.ink3)
            }
            .padding(.horizontal, 16).frame(minHeight: 52).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
