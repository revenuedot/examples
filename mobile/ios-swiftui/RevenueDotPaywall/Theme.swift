// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the sample apps' design system in SwiftUI. Monochrome ink on white (inverted in dark mode), one gold
// accent for "selected" and "live", hairline borders instead of shadows, large type, pill buttons, light haptics.
// Docs: https://revenuedot.app/docs/sdks/ios   Design notes: ../../DESIGN.md
import SwiftUI
import UIKit

enum Theme {
    static let accent = Color(red: 0xF7 / 255, green: 0xB5 / 255, blue: 0x00 / 255)
    static let ink = Color.primary
    static let ink2 = Color.primary.opacity(0.62)
    static let ink3 = Color.primary.opacity(0.42)
    static let hairline = Color.primary.opacity(0.10)
    static let fill = Color.primary.opacity(0.04)
    static let ground = Color(uiColor: .systemBackground)
    static let gutter: CGFloat = 24
    static let radius: CGFloat = 16

    static func display(_ size: CGFloat = 34) -> Font { .system(size: size, weight: .bold, design: .default) }
    static func title(_ size: CGFloat = 22) -> Font { .system(size: size, weight: .semibold) }
    static let body = Font.system(size: 17)
    static let caption = Font.system(size: 13)
    static let mono = Font.system(size: 13, design: .monospaced)
}

enum Haptic {
    static func tap() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func select() { UISelectionFeedbackGenerator().selectionChanged() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
}

/// The primary action: ink pill, full width, 56pt.
struct PrimaryButton: View {
    let title: String
    var busy = false
    let action: () -> Void
    var body: some View {
        Button { Haptic.tap(); action() } label: {
            ZStack {
                Text(title).font(.system(size: 17, weight: .semibold)).opacity(busy ? 0 : 1)
                if busy { ProgressView().tint(Color(uiColor: .systemBackground)) }
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .foregroundStyle(Color(uiColor: .systemBackground))
            .background(Theme.ink, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(Pressable())
        .disabled(busy)
    }
}

/// A quiet text action under the primary button (Restore, Not now).
struct QuietButton: View {
    let title: String
    let action: () -> Void
    var body: some View {
        Button(title) { Haptic.tap(); action() }
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(Theme.ink2)
            .frame(minHeight: 44)
    }
}

/// A selectable row: hairline card that turns ink-bordered with a gold dot when selected.
struct OptionRow<Trailing: View>: View {
    let title: String
    var subtitle: String?
    var icon: String?
    let selected: Bool
    @ViewBuilder var trailing: () -> Trailing
    let action: () -> Void
    var body: some View {
        Button { Haptic.select(); action() } label: {
            HStack(spacing: 14) {
                if let icon { Image(systemName: icon).font(.system(size: 18, weight: .medium)).frame(width: 28) }
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.system(size: 17, weight: .semibold))
                    if let subtitle { Text(subtitle).font(.system(size: 14)).foregroundStyle(Theme.ink2) }
                }
                Spacer(minLength: 8)
                trailing()
                SelectionDot(on: selected)
            }
            .padding(.horizontal, 18).padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? Theme.fill : .clear, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(selected ? Theme.ink : Theme.hairline, lineWidth: selected ? 1.5 : 1))
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(Pressable())
        .foregroundStyle(Theme.ink)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
extension OptionRow where Trailing == EmptyView {
    init(title: String, subtitle: String? = nil, icon: String? = nil, selected: Bool, action: @escaping () -> Void) {
        self.init(title: title, subtitle: subtitle, icon: icon, selected: selected, trailing: { EmptyView() }, action: action)
    }
}

/// Empty ring, or an ink ring with the gold dot: the brand's "selected".
struct SelectionDot: View {
    let on: Bool
    var body: some View {
        ZStack {
            Circle().strokeBorder(on ? Theme.ink : Theme.ink3.opacity(0.6), lineWidth: on ? 2 : 1.5).frame(width: 22, height: 22)
            if on { Circle().fill(Theme.accent).frame(width: 10, height: 10).transition(.scale) }
        }
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: on)
    }
}

/// Thin progress bar for multi-step onboarding.
struct StepBar: View {
    let step: Int
    let total: Int
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.hairline)
                Capsule().fill(Theme.ink).frame(width: g.size.width * CGFloat(step) / CGFloat(max(total, 1)))
            }
        }
        .frame(height: 4)
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: step)
        .accessibilityLabel("Step \(step) of \(total)")
    }
}

/// Small uppercase label above a section.
struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.system(size: 12, weight: .semibold)).tracking(0.8).foregroundStyle(Theme.ink3)
    }
}

/// Press feedback: scale down slightly while pressed.
struct Pressable: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.8), value: configuration.isPressed)
    }
}

/// The RevenueDot mark: an ink tile with a white R whose leg ends in the gold dot.
struct BrandMark: View {
    var size: CGFloat = 44
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.24, style: .continuous).fill(Theme.ink)
            Text("R").font(.system(size: size * 0.56, weight: .bold)).foregroundStyle(Color(uiColor: .systemBackground)).offset(x: -size * 0.04)
            Circle().fill(Theme.accent).frame(width: size * 0.2, height: size * 0.2).offset(x: size * 0.22, y: size * 0.2)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

/// The progress ring: hairline track, ink arc, gold dot at the tip.
struct FocusRing: View {
    let progress: Double
    var lineWidth: CGFloat = 12
    var body: some View {
        let p = min(max(progress, 0), 1)
        ZStack {
            Circle().stroke(Theme.hairline, lineWidth: lineWidth)
            Circle().trim(from: 0, to: p).stroke(Theme.ink, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)).rotationEffect(.degrees(-90))
            GeometryReader { g in
                let r = (min(g.size.width, g.size.height) - lineWidth) / 2
                let a = Angle.degrees(360 * p - 90).radians
                Circle().fill(Theme.accent).frame(width: lineWidth * 0.55, height: lineWidth * 0.55)
                    .position(x: g.size.width / 2 + r * cos(a), y: g.size.height / 2 + r * sin(a))
                    .opacity(p > 0 ? 1 : 0)
            }
        }
        .animation(.spring(response: 0.6, dampingFraction: 0.85), value: p)
    }
}
