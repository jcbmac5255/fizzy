require "test_helper"

class Card::ColumnPositionedTest < ActiveSupport::TestCase
  setup do
    @column = columns(:writebook_triage)
    @board = @column.board
    Current.session = Session.new(identity: users(:david).identity)
    @cards = 4.times.map do |index|
      @column.cards.create!(
        board: @board,
        title: "Reorder card #{index}",
        creator: users(:david),
        status: :published,
        last_active_at: index.minutes.ago
      )
    end
    @initial_order = @column.cards.active.ordered_in_column.where(id: @cards.map(&:id)).to_a
  end

  test "reposition_in_column moves a card to the requested position and renumbers siblings" do
    moving = @initial_order.last
    moving.reposition_in_column(1)

    expected_order = [ moving, *@initial_order[0..-2] ].map(&:id)
    actual_order = @column.cards.active.ordered_in_column.where(id: @cards.map(&:id)).pluck(:id)
    assert_equal expected_order, actual_order
  end

  test "reposition_in_column clamps positions outside range" do
    moving = @initial_order.first
    moving.reposition_in_column(@cards.size + 99)

    expected_order = [ *@initial_order[1..], moving ].map(&:id)
    actual_order = @column.cards.active.ordered_in_column.where(id: @cards.map(&:id)).pluck(:id)
    assert_equal expected_order, actual_order
  end

  test "reposition_in_column is a no-op for cards without a column" do
    card = @initial_order.first
    card.update! column: nil

    assert_nothing_raised { card.reposition_in_column(1) }
    assert_nil card.reload.column_position
  end

  test "ordered_in_column places positioned cards before unpositioned ones" do
    pinned = @initial_order.last
    pinned.update_columns(column_position: 1)

    ordered_ids = @column.cards.active.ordered_in_column.where(id: @cards.map(&:id)).pluck(:id)
    assert_equal pinned.id, ordered_ids.first
  end
end
