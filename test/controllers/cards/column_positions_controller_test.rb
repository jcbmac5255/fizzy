require "test_helper"

class Cards::ColumnPositionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as :kevin
  end

  test "update repositions card within its column" do
    column = columns(:writebook_triage)
    card = column.cards.active.ordered_in_column.last

    patch card_column_position_path(card), params: { position: 1 }, as: :turbo_stream

    assert_response :no_content
    assert_equal card.id, column.cards.active.ordered_in_column.first.id
  end

  test "update as JSON" do
    column = columns(:writebook_triage)
    card = column.cards.active.ordered_in_column.last

    patch card_column_position_path(card), params: { position: 1 }, as: :json

    assert_response :no_content
    assert_equal 1, card.reload.column_position
  end
end
