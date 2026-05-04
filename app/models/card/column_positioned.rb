module Card::ColumnPositioned
  extend ActiveSupport::Concern

  included do
    scope :ordered_in_column, -> { order(Arel.sql("cards.column_position IS NULL, cards.column_position ASC, cards.last_active_at DESC, cards.id DESC")) }
  end

  def reposition_in_column(new_position)
    return unless column

    transaction do
      siblings = column.cards.active.where.not(id: id).ordered_in_column.to_a
      target = new_position.to_i.clamp(1, siblings.size + 1)
      siblings.insert(target - 1, self)

      now = Time.current
      siblings.each_with_index do |card, index|
        desired = index + 1
        next if card.column_position == desired
        card.update_columns(column_position: desired, updated_at: now)
      end
    end
  end
end
