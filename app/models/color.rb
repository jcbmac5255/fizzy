Color = Struct.new(:name, :value, :hex)

class Color
  HEX_PATTERN = /\A#(?:[0-9a-fA-F]{3}){1,2}\z/

  class << self
    # Finds a Color by its CSS value. Returns a preset Color when `value`
    # matches one of the named presets (e.g. "var(--color-card-4)"), a
    # free-form Color when `value` is a plain hex string (e.g. "#ff5733"),
    # or a preset extracted from a legacy export format.
    def for_value(value)
      COLORS.find { |it| it.value == value } ||
        for_hex(value) ||
        extract_from_legacy_export(value)
    end

    private
      def for_hex(value)
        new(nil, value, value) if value.is_a?(String) && value.match?(HEX_PATTERN)
      end

      # Broken exports serialized Color structs instead of raw CSS values,
      # producing JSON like {"name":"Lime","value":"var(--color-card-4)"}.
      # Parse it and extract the value.
      def extract_from_legacy_export(value)
        parsed = value.is_a?(String) && JSON.parse(value)
        COLORS.find { |it| it.value == parsed["value"] } if parsed.is_a?(Hash)
      rescue JSON::ParserError
      end
  end

  def to_s
    value
  end

  # Hex fallbacks let legacy preset columns seed a native <input type="color">.
  COLORS = {
    "Blue"   => [ "var(--color-card-default)", "#2563eb" ],
    "Gray"   => [ "var(--color-card-1)",       "#6b7280" ],
    "Tan"    => [ "var(--color-card-2)",       "#a89d8b" ],
    "Yellow" => [ "var(--color-card-3)",       "#facc15" ],
    "Lime"   => [ "var(--color-card-4)",       "#84cc16" ],
    "Aqua"   => [ "var(--color-card-5)",       "#06b6d4" ],
    "Violet" => [ "var(--color-card-6)",       "#8b5cf6" ],
    "Purple" => [ "var(--color-card-7)",       "#a855f7" ],
    "Pink"   => [ "var(--color-card-8)",       "#ec4899" ]
  }.collect { |name, (value, hex)| new(name, value, hex) }.freeze
end
