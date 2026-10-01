// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: account and settings. The plan card reads the `pro` entitlement; Restore and Manage subscription are
// required on iOS. The developer section shows what RevenueDot sees: app user id, entitlement, subscriptions.
// Docs: https://revenuedot.app/docs/sdks/ios
import RevenueCat
import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: SandboxModel
    let upgrade: () -> Void
    let restartOnboarding: () -> Void
    @State private var userID = "sandbox_user_1"
    @State private var developer = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    planCard
                    group {
                        Row(icon: "arrow.clockwise", title: "Restore purchases") { Task { await model.restore() } }
                        Divider().padding(.leading, 52)
                        Row(icon: "creditcard", title: "Manage subscription") { Task { try? await Purchases.shared.showManageSubscriptions() } }
                        Divider().padding(.leading, 52)
                        Row(icon: "sparkles", title: "Redo onboarding", action: restartOnboarding)
                    }
                    developerSection
                    if !model.message.isEmpty { Text(model.message).font(.system(size: 14)).foregroundStyle(Theme.ink2) }
                    HStack(spacing: 10) {
                        BrandMark(size: 22)
                        Text("Subscriptions by RevenueDot, the open-source RevenueCat alternative.").font(Theme.caption).foregroundStyle(Theme.ink3)
                    }
                }
                .padding(.horizontal, Theme.gutter).padding(.vertical, 8)
            }
            .background(Theme.ground)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.fontWeight(.semibold).tint(Theme.ink) } }
        }
    }

    private var planCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Circle().fill(model.isPro ? Theme.accent : Theme.ink3).frame(width: 8, height: 8)
                Text(model.isPro ? "Focus Pro" : "Free plan").font(Theme.title(22))
            }
            if let e = model.proEntitlement, e.isActive {
                Text(e.willRenew ? "Renews \(e.expirationDate?.formatted(date: .abbreviated, time: .omitted) ?? "")" : "Ends \(e.expirationDate?.formatted(date: .abbreviated, time: .omitted) ?? "never")")
                    .font(.system(size: 15)).foregroundStyle(Theme.ink2)
                if e.periodType == .trial { Text("Free trial").font(.system(size: 13, weight: .semibold)).padding(.horizontal, 10).padding(.vertical, 4).background(Theme.fill, in: Capsule()) }
            } else {
                Text("Upgrade for Deep and Flow sessions, weekly reports and the distraction shield.").font(.system(size: 15)).foregroundStyle(Theme.ink2)
                PrimaryButton(title: "See plans", action: upgrade)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(RoundedRectangle(cornerRadius: Theme.radius + 4, style: .continuous).strokeBorder(Theme.hairline))
    }

    private var developerSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { withAnimation(.snappy) { developer.toggle() } } label: {
                HStack {
                    Eyebrow(text: "Developer")
                    Spacer()
                    Image(systemName: "chevron.down").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.ink3).rotationEffect(.degrees(developer ? 180 : 0))
                }
                .frame(minHeight: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if developer {
                group {
                    Field(label: "App user id", value: model.appUserID, copy: true)
                    Divider()
                    Field(label: "Entitlement \(SandboxConfig.entitlement)", value: model.isPro ? "active" : "not active")
                    Divider()
                    Field(label: "Subscriptions", value: model.activeSubscriptions.isEmpty ? "none" : model.activeSubscriptions.joined(separator: ", "))
                    Divider()
                    Field(label: "Current offering", value: model.offeringID ?? "none")
                    Divider()
                    Field(label: "Server", value: Purchases.proxyURL?.host() ?? "api.revenuecat.com")
                    Divider()
                    if let e = model.loadError {
                        Text(e).font(.system(size: 13)).foregroundStyle(Theme.ink2).padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        Divider()
                    }
                    HStack(spacing: 10) {
                        if model.loggedInID == nil {
                            TextField("User id", text: $userID).font(Theme.mono).textInputAutocapitalization(.never).autocorrectionDisabled()
                        } else {
                            Text(model.loggedInID ?? "").font(Theme.mono)
                            Spacer()
                        }
                        Button(model.loggedInID == nil ? "Log in" : "Log out") { Task { await model.toggleLogin(userID) } }
                            .font(.system(size: 15, weight: .semibold)).tint(Theme.ink)
                            .disabled(model.busy || (model.loggedInID == nil && userID.isEmpty))
                    }
                    .padding(.horizontal, 16).frame(minHeight: 52)
                }
                .transition(.opacity)
            }
        }
    }

    private func group<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        VStack(spacing: 0, content: c)
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.hairline))
    }
}

private struct Row: View {
    let icon: String
    let title: String
    let action: () -> Void
    var body: some View {
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

private struct Field: View {
    let label: String
    let value: String
    var copy = false
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(label).font(.system(size: 14)).foregroundStyle(Theme.ink2)
            Spacer(minLength: 12)
            Text(value).font(Theme.mono).lineLimit(1).truncationMode(.middle).textSelection(.enabled)
            if copy {
                Button { UIPasteboard.general.string = value; Haptic.success() } label: { Image(systemName: "doc.on.doc").font(.system(size: 13)) }
                    .foregroundStyle(Theme.ink2).accessibilityLabel("Copy app user id")
            }
        }
        .padding(.horizontal, 16).frame(minHeight: 48)
    }
}
