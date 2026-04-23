require "test_helper"

class BoardTest < ActiveSupport::TestCase
  test "copy_columns_from duplicates name, color, and order" do
    template = boards(:writebook)
    target = Board.create!(name: "Copy", creator: users(:kevin), account: accounts("37s"), all_access: true)

    target.copy_columns_from(template)

    expected = template.columns.sorted.pluck(:name, :color)
    assert_equal expected, target.columns.sorted.pluck(:name, :color)
  end

  test "copy_columns_from does not copy cards" do
    template = boards(:writebook)
    assert template.cards.any?, "fixture sanity check"

    target = Board.create!(name: "Copy", creator: users(:kevin), account: accounts("37s"), all_access: true)
    target.copy_columns_from(template)

    assert_empty target.cards
  end
end
